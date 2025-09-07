-- Add missing updated_at column to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to have the updated_at value
UPDATE public.trips 
SET updated_at = created_at 
WHERE updated_at IS NULL;