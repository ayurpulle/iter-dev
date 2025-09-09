-- Fix the itinerary collaboration notification trigger
-- The issue is that it's creating notifications for the invited_by user instead of the invited user

-- Drop existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS itinerary_collaboration_notification_trigger ON public.itinerary_collaborators;
DROP TRIGGER IF EXISTS create_itinerary_collaboration_notification_trigger ON public.itinerary_collaborators;
DROP FUNCTION IF EXISTS public.create_itinerary_collaboration_notification() CASCADE;

-- Create the corrected function that sends notification to the invited user (not the inviter)
CREATE OR REPLACE FUNCTION public.create_itinerary_collaboration_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER create_itinerary_collaboration_notification_trigger
  AFTER INSERT ON public.itinerary_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.create_itinerary_collaboration_notification();