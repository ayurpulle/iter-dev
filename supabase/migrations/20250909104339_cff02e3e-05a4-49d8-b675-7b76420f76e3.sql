-- Add foreign key constraints with cascade delete to prevent orphaned records
-- This will automatically delete related records when a post is deleted

-- Add foreign key for post_likes -> posts with cascade delete
ALTER TABLE post_likes 
DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;

ALTER TABLE post_likes 
ADD CONSTRAINT post_likes_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Add foreign key for comments -> posts with cascade delete  
ALTER TABLE comments
DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

ALTER TABLE comments
ADD CONSTRAINT comments_post_id_fkey
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Add foreign key for saved_items -> posts with cascade delete (for posts)
-- Note: saved_items has item_id that can reference different tables based on item_type
-- We'll add a check to ensure data integrity
CREATE OR REPLACE FUNCTION check_saved_item_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if item exists based on item_type
  IF NEW.item_type = 'post' THEN
    IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.item_id) THEN
      RAISE EXCEPTION 'Referenced post does not exist';
    END IF;
  ELSIF NEW.item_type = 'trip' THEN
    IF NOT EXISTS (SELECT 1 FROM trips WHERE id = NEW.item_id) THEN
      RAISE EXCEPTION 'Referenced trip does not exist';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate saved_items references
DROP TRIGGER IF EXISTS validate_saved_item_reference ON saved_items;
CREATE TRIGGER validate_saved_item_reference
  BEFORE INSERT OR UPDATE ON saved_items
  FOR EACH ROW
  EXECUTE FUNCTION check_saved_item_reference();