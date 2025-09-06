-- Enable real-time updates for notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Create a function to automatically create notifications for friend requests
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create notification for the friend being requested
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
    'New Follow Request',
    'Someone wants to follow you',
    NEW.user_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for friend request notifications
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friends;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friends
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.create_friend_request_notification();

-- Fix posts RLS policy to allow users to see all public posts AND their own posts
DROP POLICY IF EXISTS "Users can view public posts" ON public.posts;
CREATE POLICY "Users can view public posts and own posts" 
ON public.posts 
FOR SELECT 
USING (true);

-- Add missing delete post functionality for post owners
CREATE POLICY "Users can delete their own posts" 
ON public.posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure post_likes RLS policies are correct
DROP POLICY IF EXISTS "Users can view all likes" ON public.post_likes;
CREATE POLICY "Users can view all likes" 
ON public.post_likes 
FOR SELECT 
USING (true);

-- Ensure comments RLS policies are correct
DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
CREATE POLICY "Users can view all comments" 
ON public.comments 
FOR SELECT 
USING (true);

-- Add real-time for other tables
ALTER TABLE post_likes REPLICA IDENTITY FULL;
ALTER TABLE comments REPLICA IDENTITY FULL;
ALTER TABLE posts REPLICA IDENTITY FULL;