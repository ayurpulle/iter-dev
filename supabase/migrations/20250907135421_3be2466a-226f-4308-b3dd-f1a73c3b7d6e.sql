-- First, let's check the current state and fix the logic
-- Reset all counts to 0 first
UPDATE public.profiles SET followers_count = 0, following_count = 0;

-- Now recalculate correctly:
-- following_count = how many people this user is following (how many requests they sent that were accepted)
-- followers_count = how many people are following this user (how many requests they received that were accepted)

WITH following_counts AS (
  SELECT 
    user_id,
    COUNT(*) as following_count
  FROM friends 
  WHERE status = 'accepted'
  GROUP BY user_id
),
followers_counts AS (
  SELECT 
    friend_id as user_id,
    COUNT(*) as followers_count
  FROM friends 
  WHERE status = 'accepted'
  GROUP BY friend_id
)
UPDATE profiles 
SET 
  following_count = COALESCE(following_c.following_count, 0),
  followers_count = COALESCE(followers_c.followers_count, 0)
FROM profiles p
LEFT JOIN following_counts following_c ON p.user_id = following_c.user_id
LEFT JOIN followers_counts followers_c ON p.user_id = followers_c.user_id
WHERE profiles.user_id = p.user_id;

-- Now let's verify the trigger logic is correct
DROP TRIGGER IF EXISTS update_friend_counts_trigger ON public.friends;

CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Log for debugging
  RAISE LOG 'Friend count trigger fired: operation=%, old_status=%, new_status=%, user_id=%, friend_id=%', 
    TG_OP, 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.status ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.status ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.friend_id ELSE NEW.friend_id END;

  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    -- user_id follows friend_id, so:
    -- user_id gets +1 following (they are following someone)
    -- friend_id gets +1 followers (someone is following them)
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.user_id;
    
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.friend_id;
    
    RAISE LOG 'INSERT accepted: user % now following +1, user % now has +1 followers', NEW.user_id, NEW.friend_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    -- Same logic as INSERT when transitioning to accepted
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.user_id;
    
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.friend_id;
    
    RAISE LOG 'UPDATE to accepted: user % now following +1, user % now has +1 followers', NEW.user_id, NEW.friend_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    -- Reverse the counts when unfollowing
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = NEW.user_id;
    
    UPDATE public.profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = NEW.friend_id;
    
    RAISE LOG 'UPDATE from accepted: user % now following -1, user % now has -1 followers', NEW.user_id, NEW.friend_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Reverse the counts when deleting an accepted relationship
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.user_id;
    
    UPDATE public.profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = OLD.friend_id;
    
    RAISE LOG 'DELETE accepted: user % now following -1, user % now has -1 followers', OLD.user_id, OLD.friend_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update friend counts
CREATE TRIGGER update_friend_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_friend_counts();