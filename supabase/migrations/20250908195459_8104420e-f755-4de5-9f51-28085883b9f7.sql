-- Drop and recreate the INSERT policy with simpler check
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);