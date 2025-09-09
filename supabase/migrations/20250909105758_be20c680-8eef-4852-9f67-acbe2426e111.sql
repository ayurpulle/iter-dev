-- Clean up orphaned data that might be causing stale posts to appear

-- Remove posts that reference non-existent trips
DELETE FROM posts 
WHERE trip_id IS NOT NULL 
AND trip_id NOT IN (SELECT id FROM trips);

-- Remove posts that reference non-existent users (orphaned posts)
DELETE FROM posts 
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Remove any trips that don't have valid users
DELETE FROM trips 
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Remove any saved_items that reference non-existent posts
DELETE FROM saved_items 
WHERE item_type = 'post' 
AND item_id NOT IN (SELECT id FROM posts);

-- Remove any saved_items that reference non-existent trips
DELETE FROM saved_items 
WHERE item_type = 'trip' 
AND item_id NOT IN (SELECT id FROM trips);