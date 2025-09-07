-- Check if user is authenticated and get their ID
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
BEGIN
  -- Return the authenticated user's ID
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop and recreate the INSERT policy with better error handling
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);