-- Add foreign key relationship between posts and profiles
ALTER TABLE posts 
ADD CONSTRAINT posts_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key relationship between posts.user_id and profiles.user_id
-- Since we can't directly reference auth.users, we'll create a function to ensure data integrity
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