-- Check current RLS policies for saved_itineraries
\d+ saved_itineraries;

-- Drop and recreate the INSERT policy with simpler check
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Make sure the user_id column is not nullable
ALTER TABLE public.saved_itineraries 
ALTER COLUMN user_id SET NOT NULL;