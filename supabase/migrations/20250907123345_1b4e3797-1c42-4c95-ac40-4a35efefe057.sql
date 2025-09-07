-- Add base location and default currency to profiles table
ALTER TABLE public.profiles 
ADD COLUMN base_location text,
ADD COLUMN default_currency text DEFAULT 'USD';

-- Update the trips table to include more detailed location data for better matching
ALTER TABLE public.trips 
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN destination text;