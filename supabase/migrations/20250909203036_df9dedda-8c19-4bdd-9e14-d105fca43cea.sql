-- Add foreign key relationship between saved_itineraries and profiles
-- This will allow proper joins between the tables

-- First, add the foreign key constraint
ALTER TABLE public.saved_itineraries 
ADD CONSTRAINT saved_itineraries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;