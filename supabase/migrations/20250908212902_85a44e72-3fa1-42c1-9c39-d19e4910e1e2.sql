-- Add metadata column to messages table for storing shared post/itinerary data
ALTER TABLE public.messages ADD COLUMN metadata jsonb;