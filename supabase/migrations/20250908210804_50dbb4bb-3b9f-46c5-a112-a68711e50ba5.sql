-- Create function to group notifications by type and post (parent_id already exists)
CREATE OR REPLACE FUNCTION public.group_notifications_by_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_notification_id uuid;
  like_count integer := 0;
  comment_count integer := 0;
  latest_user_name text;
  notification_message text;
BEGIN
  -- Only process like and comment notifications
  IF NEW.type NOT IN ('like', 'comment', 'comment_reply') THEN
    RETURN NEW;
  END IF;

  -- Check if there's already a grouped notification for this post and type
  SELECT id INTO existing_notification_id
  FROM public.notifications
  WHERE user_id = NEW.user_id 
    AND type = NEW.type
    AND related_post_id = NEW.related_post_id
    AND read = false
    AND title LIKE '%others%' -- Only update grouped notifications
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get the name of the user who triggered this notification
  SELECT name INTO latest_user_name
  FROM public.profiles
  WHERE user_id = NEW.related_user_id;

  IF latest_user_name IS NULL THEN
    latest_user_name := 'Someone';
  END IF;

  IF existing_notification_id IS NOT NULL THEN
    -- Update existing grouped notification
    IF NEW.type = 'like' THEN
      -- Count total likes on this post from different users
      SELECT COUNT(DISTINCT user_id) INTO like_count
      FROM public.post_likes
      WHERE post_id = NEW.related_post_id;
      
      notification_message := latest_user_name || ' and ' || (like_count - 1) || ' others liked your post';
      
      UPDATE public.notifications
      SET message = notification_message,
          related_user_id = NEW.related_user_id,
          created_at = now()
      WHERE id = existing_notification_id;
      
    ELSIF NEW.type IN ('comment', 'comment_reply') THEN
      -- Count total comments on this post from different users
      SELECT COUNT(DISTINCT user_id) INTO comment_count
      FROM public.comments
      WHERE post_id = NEW.related_post_id;
      
      notification_message := latest_user_name || ' and ' || (comment_count - 1) || ' others commented on your post';
      
      UPDATE public.notifications
      SET message = notification_message,
          related_user_id = NEW.related_user_id,
          created_at = now()
      WHERE id = existing_notification_id;
    END IF;
    
    -- Delete the new notification since we updated the existing one
    DELETE FROM public.notifications WHERE id = NEW.id;
    RETURN NULL;
  ELSE
    -- Check if we should create a grouped notification
    IF NEW.type = 'like' THEN
      SELECT COUNT(DISTINCT user_id) INTO like_count
      FROM public.post_likes
      WHERE post_id = NEW.related_post_id;
      
      IF like_count > 1 THEN
        NEW.message := latest_user_name || ' and ' || (like_count - 1) || ' others liked your post';
        NEW.title := 'New Likes';
      END IF;
      
    ELSIF NEW.type IN ('comment', 'comment_reply') THEN
      SELECT COUNT(DISTINCT user_id) INTO comment_count
      FROM public.comments
      WHERE post_id = NEW.related_post_id;
      
      IF comment_count > 1 THEN
        NEW.message := latest_user_name || ' and ' || (comment_count - 1) || ' others commented on your post';
        NEW.title := 'New Comments';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for notification grouping
DROP TRIGGER IF EXISTS group_notifications_trigger ON public.notifications;
CREATE TRIGGER group_notifications_trigger
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.group_notifications_by_post();