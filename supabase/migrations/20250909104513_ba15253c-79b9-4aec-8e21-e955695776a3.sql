-- Drop the trigger and function properly with cascade
DROP TRIGGER IF EXISTS validate_saved_item_reference ON saved_items;
DROP FUNCTION IF EXISTS check_saved_item_reference() CASCADE;

-- Recreate the function with proper search_path setting
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER validate_saved_item_reference
  BEFORE INSERT OR UPDATE ON saved_items
  FOR EACH ROW
  EXECUTE FUNCTION check_saved_item_reference();