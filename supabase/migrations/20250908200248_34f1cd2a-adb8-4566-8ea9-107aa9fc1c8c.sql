-- Debug the current RLS policy by checking user authentication
-- First, let's see what the current user_id looks like in the context
SELECT auth.uid() as current_auth_uid;

-- Check if there are any issues with the existing policy
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

-- Create a more permissive policy for debugging
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also ensure the table has proper RLS enabled
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;