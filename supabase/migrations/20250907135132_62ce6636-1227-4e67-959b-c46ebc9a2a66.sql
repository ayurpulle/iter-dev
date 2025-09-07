-- Fix the following count calculation issue
-- The issue might be that we're not properly handling the different scenarios
-- Let me recreate the trigger with better logic

DROP TRIGGER IF EXISTS update_friend_counts_trigger ON public.friends;

CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Log for debugging
  RAISE LOG 'Friend count trigger fired: operation=%, old_status=%, new_status=%', 
    TG_OP, 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.status ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.status ELSE NULL END;

  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.friend_id;
    
    RAISE LOG 'INSERT accepted: user_id=% gets +1 following, friend_id=% gets +1 followers', NEW.user_id, NEW.friend_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.friend_id;
    
    RAISE LOG 'UPDATE to accepted: user_id=% gets +1 following, friend_id=% gets +1 followers', NEW.user_id, NEW.friend_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = NEW.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = NEW.friend_id;
    
    RAISE LOG 'UPDATE from accepted: user_id=% gets -1 following, friend_id=% gets -1 followers', NEW.user_id, NEW.friend_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Update following count for the user who sent the request
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.user_id;
    
    -- Update followers count for the user who received the request
    UPDATE public.profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = OLD.friend_id;
    
    RAISE LOG 'DELETE accepted: user_id=% gets -1 following, friend_id=% gets -1 followers', OLD.user_id, OLD.friend_id;
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