-- Add overall trip caption and budget columns to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS overall_caption TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS overall_budget TEXT;