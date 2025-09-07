-- Add privacy setting to posts
ALTER TABLE public.posts ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Create table for itinerary collaborators
CREATE TABLE public.itinerary_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id uuid NOT NULL REFERENCES public.saved_itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(itinerary_id, user_id)
);

-- Enable RLS on itinerary_collaborators
ALTER TABLE public.itinerary_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for itinerary_collaborators
CREATE POLICY "Users can view collaborations they're part of"
ON public.itinerary_collaborators
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = invited_by OR 
       auth.uid() IN (SELECT user_id FROM public.saved_itineraries WHERE id = itinerary_id));

CREATE POLICY "Users can invite collaborators to their itineraries"
ON public.itinerary_collaborators
FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.saved_itineraries WHERE id = itinerary_id));

CREATE POLICY "Users can update their own collaboration status"
ON public.itinerary_collaborators
FOR UPDATE
USING (auth.uid() = user_id OR 
       auth.uid() IN (SELECT user_id FROM public.saved_itineraries WHERE id = itinerary_id));

CREATE POLICY "Users can remove collaborators from their itineraries"
ON public.itinerary_collaborators
FOR DELETE
USING (auth.uid() = invited_by OR 
       auth.uid() IN (SELECT user_id FROM public.saved_itineraries WHERE id = itinerary_id));

-- Update saved_itineraries policies to allow collaborators to view/edit
DROP POLICY IF EXISTS "Users can view their own saved itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can update their own saved itineraries" ON public.saved_itineraries;

CREATE POLICY "Users can view their own and collaborated itineraries"
ON public.saved_itineraries
FOR SELECT
USING (auth.uid() = user_id OR 
       auth.uid() IN (SELECT user_id FROM public.itinerary_collaborators 
                     WHERE itinerary_id = id AND status = 'accepted'));

CREATE POLICY "Users can update their own and editable collaborated itineraries"
ON public.saved_itineraries
FOR UPDATE
USING (auth.uid() = user_id OR 
       auth.uid() IN (SELECT user_id FROM public.itinerary_collaborators 
                     WHERE itinerary_id = id AND status = 'accepted' AND permission IN ('edit', 'admin')));

-- Update posts policies to respect privacy settings
DROP POLICY IF EXISTS "Users can view public posts and own posts" ON public.posts;

CREATE POLICY "Users can view public posts, own posts, and friends' private posts"
ON public.posts
FOR SELECT
USING (
  (is_private = false) OR 
  (auth.uid() = user_id) OR 
  (is_private = true AND auth.uid() IN (
    SELECT CASE 
      WHEN user_id = auth.uid() THEN friend_id 
      ELSE user_id 
    END
    FROM public.friends 
    WHERE status = 'accepted' AND 
          (user_id = posts.user_id OR friend_id = posts.user_id)
  ))
);

-- Add DELETE policy for conversations
CREATE POLICY "Users can delete conversations they participate in"
ON public.conversations
FOR DELETE
USING (auth.uid() = ANY(participants));

-- Create trigger for itinerary_collaborators updated_at
CREATE TRIGGER update_itinerary_collaborators_updated_at
BEFORE UPDATE ON public.itinerary_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify collaborators
CREATE OR REPLACE FUNCTION public.create_itinerary_collaboration_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Create notification for the invited user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_user_id,
    data
  ) VALUES (
    NEW.user_id,
    'itinerary_invite',
    'Itinerary Collaboration Invite',
    'You''ve been invited to collaborate on an itinerary',
    NEW.invited_by,
    jsonb_build_object('itinerary_id', NEW.itinerary_id, 'collaboration_id', NEW.id)
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for collaboration notifications
CREATE TRIGGER itinerary_collaboration_notification_trigger
AFTER INSERT ON public.itinerary_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.create_itinerary_collaboration_notification();