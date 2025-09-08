-- Create a test function to debug auth context during inserts
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS TABLE(
  current_user_id uuid,
  current_role text,
  jwt_claims jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    auth.role()::text as current_role,
    auth.jwt()::jsonb as jwt_claims;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the current auth context
SELECT * FROM debug_auth_context();

-- Let's also create a more robust RLS policy that logs what's happening
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

-- Create a debugging policy that allows inserts for now and logs the issue
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (
  -- Log the auth state for debugging
  CASE 
    WHEN auth.uid() IS NULL THEN 
      RAISE NOTICE 'RLS Debug: auth.uid() is NULL for user_id: %', NEW.user_id
    WHEN auth.uid() != NEW.user_id THEN
      RAISE NOTICE 'RLS Debug: auth.uid() % != user_id %', auth.uid(), NEW.user_id
    ELSE
      RAISE NOTICE 'RLS Debug: Auth check passed for user %', auth.uid()
  END,
  -- The actual check
  auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id
);