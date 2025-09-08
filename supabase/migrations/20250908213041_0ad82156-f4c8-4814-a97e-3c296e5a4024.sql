-- Fix the follower/following counts based on actual data
-- First, reset all counts to ensure accuracy
UPDATE profiles SET followers_count = 0, following_count = 0;

-- Update followers count (people who follow this user)
UPDATE profiles 
SET followers_count = (
  SELECT COUNT(*) 
  FROM friends 
  WHERE friends.friend_id = profiles.user_id 
  AND friends.status = 'accepted'
);

-- Update following count (people this user follows)  
UPDATE profiles 
SET following_count = (
  SELECT COUNT(*) 
  FROM friends 
  WHERE friends.user_id = profiles.user_id 
  AND friends.status = 'accepted'
);