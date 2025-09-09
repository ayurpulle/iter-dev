-- Update the friend counts trigger to handle bidirectional friendship properly
-- For private accounts: both users need to follow each other to be considered "friends"
-- For public accounts: following is one-way but still tracks properly

CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;