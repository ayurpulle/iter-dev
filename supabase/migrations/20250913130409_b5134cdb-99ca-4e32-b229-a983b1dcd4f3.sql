-- Add 'itinerary_complete' and 'itinerary_error' to the allowed notification types
ALTER TABLE public.notifications 
DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['like'::text, 'comment'::text, 'comment_reply'::text, 'friend_request'::text, 'itinerary_invite'::text, 'itinerary_share'::text, 'itinerary_complete'::text, 'itinerary_error'::text]));