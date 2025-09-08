-- Create a debug function to check auth state
CREATE OR REPLACE FUNCTION debug_saved_itineraries_policy()
RETURNS TABLE(auth_uid text, policy_check boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(auth.uid()::text, 'NULL') as auth_uid,
    (auth.uid() IS NOT NULL) as policy_check;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;