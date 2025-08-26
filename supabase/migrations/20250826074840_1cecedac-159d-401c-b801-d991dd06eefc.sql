-- Add image_url column to posts table and remove content requirement
ALTER TABLE public.posts 
ADD COLUMN image_url TEXT,
ALTER COLUMN content DROP NOT NULL;