-- Fix function search path security issue
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE user_id = user_uuid AND read = false;
$$;