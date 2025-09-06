-- Just add the validation trigger without the duplicate foreign key
CREATE OR REPLACE FUNCTION validate_post_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists in profiles table
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'User profile must exist before creating posts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger to validate user exists when creating posts
DROP TRIGGER IF EXISTS validate_post_user_trigger ON posts;
CREATE TRIGGER validate_post_user_trigger
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_post_user_exists();