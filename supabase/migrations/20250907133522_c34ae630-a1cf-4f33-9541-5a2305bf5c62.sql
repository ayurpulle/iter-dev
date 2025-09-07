-- First, let's check what notification types are currently allowed
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'notifications_type_check';

-- Update the notifications type constraint to include 'friend_request'
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'friend_request', 'follow', 'trip_like', 'iter_inspiration'));

-- Add is_public column to profiles table for auto-accepting friend requests
ALTER TABLE public.profiles 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Create a function to auto-accept friend requests for public profiles
CREATE OR REPLACE FUNCTION public.auto_accept_friend_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the friend being requested has a public profile
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = NEW.friend_id AND is_public = true
  ) THEN
    -- Auto-accept the friend request
    NEW.status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-accept friend requests for public profiles
DROP TRIGGER IF EXISTS auto_accept_public_friend_requests ON public.friends;
CREATE TRIGGER auto_accept_public_friend_requests
  BEFORE INSERT ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_friend_requests();