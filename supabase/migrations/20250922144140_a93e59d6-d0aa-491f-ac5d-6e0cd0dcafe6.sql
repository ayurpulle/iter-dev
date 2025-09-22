-- Fix notification issues: prevent duplicate friend notifications, stop self-notifications for itineraries, and fix follow-back logic

-- 1. Fix friend notification function to prevent duplicates and use proper names
CREATE OR REPLACE FUNCTION public.create_friend_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    requester_name text;
    friend_name text;
BEGIN
    -- Get names for notifications from profiles table
    SELECT name INTO requester_name FROM public.profiles WHERE user_id = NEW.user_id;
    SELECT name INTO friend_name FROM public.profiles WHERE user_id = NEW.friend_id;
    
    -- Fallback to "Someone" if name is not available
    IF requester_name IS NULL THEN
        requester_name := 'Someone';
    END IF;
    
    IF friend_name IS NULL THEN
        friend_name := 'Someone';
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Only create notification for new friend requests (status = 'pending')
        IF NEW.status = 'pending' THEN
            -- Check if notification already exists to prevent duplicates
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = NEW.friend_id 
                AND type = 'friend_request' 
                AND friend_request_id = NEW.id
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    related_user_id,
                    friend_request_id
                ) VALUES (
                    NEW.friend_id,
                    'friend_request',
                    'Follow Request',
                    requester_name || ' wants to follow you',
                    NEW.user_id,
                    NEW.id
                );
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Handle status changes
        IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
            -- Delete the original friend request notification
            DELETE FROM public.notifications 
            WHERE user_id = NEW.friend_id 
            AND type = 'friend_request' 
            AND friend_request_id = NEW.id;
            
            -- Create follow confirmation notification for the original requester
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                related_user_id
            ) VALUES (
                NEW.user_id,
                'friend_accepted',
                'Follow Accepted',
                friend_name || ' is now following you',
                NEW.friend_id
            );
            
        ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
            -- Just delete the original notification
            DELETE FROM public.notifications 
            WHERE user_id = NEW.friend_id 
            AND type = 'friend_request' 
            AND friend_request_id = NEW.id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Fix itinerary collaboration notification to not notify the inviter
CREATE OR REPLACE FUNCTION public.create_itinerary_collaboration_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only create notification if the invited user is different from the inviter
  IF NEW.user_id != NEW.invited_by THEN
    -- Get the itinerary title for the notification
    DECLARE 
      itinerary_title TEXT;
    BEGIN
      SELECT title INTO itinerary_title 
      FROM public.saved_itineraries 
      WHERE id = NEW.itinerary_id;
      
      -- Create notification for the invited user (NEW.user_id), not the inviter
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_user_id,
        data
      ) VALUES (
        NEW.user_id,  -- Send notification TO the invited user
        'itinerary_invite',
        'Itinerary Collaboration Invite',
        'You''ve been invited to collaborate on "' || COALESCE(itinerary_title, 'an itinerary') || '"',
        NEW.invited_by,  -- FROM the inviter
        jsonb_build_object('itinerary_id', NEW.itinerary_id, 'collaboration_id', NEW.id)
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;