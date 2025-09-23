-- Update the posts RLS policy to fix feed visibility
DROP POLICY IF EXISTS "Users can view public posts, own posts, and friends' private po" ON public.posts;

-- Create new policy with correct visibility rules
CREATE POLICY "Users can view own posts and posts from followed users" 
ON public.posts 
FOR SELECT 
USING (
  -- User can see their own posts
  auth.uid() = user_id 
  OR 
  -- User can see posts from people they follow (both private and public)
  auth.uid() IN (
    SELECT 
      CASE
        WHEN friends.user_id = auth.uid() THEN friends.friend_id
        ELSE friends.user_id
      END AS user_id
    FROM friends
    WHERE friends.status = 'accepted'
    AND (friends.user_id = posts.user_id OR friends.friend_id = posts.user_id)
  )
);