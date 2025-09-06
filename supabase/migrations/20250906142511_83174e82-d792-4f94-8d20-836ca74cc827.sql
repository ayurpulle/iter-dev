-- Create storage bucket for trip photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trip-photos', 'trip-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create storage policies for trip photos
CREATE POLICY "Trip photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'trip-photos');

CREATE POLICY "Users can upload trip photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their trip photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their trip photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add missing columns to trips table if not exists
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS cost text,
ADD COLUMN IF NOT EXISTS companions text,
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS images text[];

-- Create trigger for updating trips updated_at
CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();