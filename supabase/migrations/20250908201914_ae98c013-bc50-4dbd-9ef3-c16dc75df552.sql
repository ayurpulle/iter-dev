-- Drop the temporary debugging policy and restore proper security
DROP POLICY IF EXISTS "Temp debug policy for saved itineraries" ON public.saved_itineraries;

-- Create the proper RLS policy that only allows users to save their own itineraries
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);