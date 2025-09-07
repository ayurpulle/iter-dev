-- Fix the initial counts calculation and trigger
-- First, let's recalculate all counts correctly
WITH following_counts AS (
  SELECT 
    user_id,
    COUNT(*) as following_count
  FROM friends 
  WHERE status = 'accepted'
  GROUP BY user_id
),
follower_counts AS (
  SELECT 
    friend_id as user_id,
    COUNT(*) as followers_count
  FROM friends 
  WHERE status = 'accepted'
  GROUP BY friend_id
)
UPDATE profiles 
SET 
  following_count = COALESCE(fc.following_count, 0),
  followers_count = COALESCE(foc.followers_count, 0)
FROM following_counts fc
FULL OUTER JOIN follower_counts foc ON fc.user_id = foc.user_id
WHERE profiles.user_id = COALESCE(fc.user_id, foc.user_id);

-- Also reset any remaining counts to 0 that weren't updated
UPDATE profiles 
SET following_count = 0, followers_count = 0 
WHERE user_id NOT IN (
  SELECT DISTINCT user_id FROM friends WHERE status = 'accepted'
  UNION
  SELECT DISTINCT friend_id FROM friends WHERE status = 'accepted'
);