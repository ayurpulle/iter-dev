-- Fix the posts RLS policy to properly show posts from followed users
DROP POLICY IF EXISTS "Users can view own posts and posts from followed users" ON public.posts;

-- Create corrected policy that shows posts from people you follow (both public and private)
CREATE POLICY "Users can view own posts and posts from followed users" 
ON public.posts 
FOR SELECT 
USING (
  -- User can see their own posts
  auth.uid() = user_id 
  OR 
  -- User can see posts from people they follow (both public and private posts)
  auth.uid() IN (
    SELECT user_id
    FROM friends
    WHERE friend_id = posts.user_id 
    AND status = 'accepted'
  )
  OR
  -- User can see posts where they are the friend_id and poster is user_id (mutual following)
  auth.uid() IN (
    SELECT friend_id
    FROM friends
    WHERE user_id = posts.user_id 
    AND status = 'accepted'
  )
);