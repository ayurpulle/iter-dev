-- Fix the search_path mutable security warning by setting search_path for the function
DROP FUNCTION IF EXISTS check_saved_item_reference();

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
$$ LANGUAGE plpgsql SET search_path = public;