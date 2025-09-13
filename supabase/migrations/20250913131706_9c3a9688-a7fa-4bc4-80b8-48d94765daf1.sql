-- Update the friend request notification trigger to create proper follow notifications
-- and prevent duplicates

-- First, drop the existing trigger and function properly
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friends;
DROP FUNCTION IF EXISTS public.create_friend_request_notification();

-- Create an improved function for friend notifications
CREATE OR REPLACE FUNCTION public.create_friend_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    requester_name text;
    friend_name text;
BEGIN
    -- Get names for notifications
    SELECT name INTO requester_name FROM public.profiles WHERE user_id = NEW.user_id;
    SELECT name INTO friend_name FROM public.profiles WHERE user_id = NEW.friend_id;
    
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

-- Create triggers for both INSERT and UPDATE
CREATE TRIGGER create_friend_notification_insert_trigger
    AFTER INSERT ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION public.create_friend_notification();

CREATE TRIGGER create_friend_notification_update_trigger
    AFTER UPDATE ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION public.create_friend_notification();

-- Update the notification types constraint to include friend_accepted
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'like', 
    'comment', 
    'reply', 
    'friend_request', 
    'friend_accepted',
    'friend_post', 
    'iter_inspiration', 
    'itinerary_invite', 
    'itinerary_share',
    'itinerary_complete', 
    'itinerary_error'
));