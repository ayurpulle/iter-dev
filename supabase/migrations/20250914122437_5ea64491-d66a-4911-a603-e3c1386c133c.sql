-- Add detailed photo information to trips table
ALTER TABLE trips ADD COLUMN photo_details JSONB DEFAULT '[]'::jsonb;

-- The photo_details will be an array of objects with structure:
-- [
--   {
--     "url": "image_url",
--     "caption": "photo caption",
--     "budget": "photo budget",
--     "tagged_friends": ["friend1", "friend2"]
--   }
-- ]

-- Update the trip insertion policy to allow photo_details
COMMENT ON COLUMN trips.photo_details IS 'Array of detailed photo information with captions, budgets, and tagged friends';