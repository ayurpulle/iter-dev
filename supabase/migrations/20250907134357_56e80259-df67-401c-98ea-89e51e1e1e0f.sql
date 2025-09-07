-- Add follower and following counts to profiles table
ALTER TABLE public.profiles 
ADD COLUMN followers_count integer DEFAULT 0 NOT NULL,
ADD COLUMN following_count integer DEFAULT 0 NOT NULL;

-- Create function to update follower/following counts
CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.friend_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.friend_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = following_count - 1 
    WHERE user_id = OLD.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = followers_count - 1 
    WHERE user_id = OLD.friend_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update friend counts
DROP TRIGGER IF EXISTS update_friend_counts_trigger ON public.friends;
CREATE TRIGGER update_friend_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_friend_counts();

-- Initialize existing counts (this will calculate current counts for existing users)
WITH friend_counts AS (
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
FROM profiles p
LEFT JOIN friend_counts fc ON p.user_id = fc.user_id
LEFT JOIN follower_counts foc ON p.user_id = foc.user_id
WHERE profiles.user_id = p.user_id;