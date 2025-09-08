-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'current_user_id', auth.uid(),
    'current_role', auth.role(),
    'has_jwt', (auth.jwt() IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;