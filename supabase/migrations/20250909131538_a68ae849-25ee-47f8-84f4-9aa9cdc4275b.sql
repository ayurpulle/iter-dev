-- First, let's see what notification types are currently allowed
-- We need to add the missing notification types for itinerary sharing

-- Add the missing notification types to the check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Create a new check constraint that includes all notification types we need
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'like', 
  'comment', 
  'comment_reply', 
  'friend_request', 
  'itinerary_invite',
  'itinerary_share'
));