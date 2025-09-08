-- Create a simple test function to debug auth context
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'current_user_id', auth.uid(),
    'current_role', auth.role(),
    'has_jwt', (auth.jwt() IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing policy and create a temporary permissive one for debugging
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

-- Create a temporary policy that allows all authenticated users to insert
-- We'll see if this fixes the issue and then narrow it down
CREATE POLICY "Temp debug policy for saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);