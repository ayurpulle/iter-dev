-- Drop the current policy and create a simpler one for debugging
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

-- Create a more permissive policy temporarily to test
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);