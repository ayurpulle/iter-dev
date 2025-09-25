-- Fix collaboration permissions to grant edit access to collaborators
-- Update existing policies to ensure collaborators can edit
DROP POLICY IF EXISTS "Users can update their own and editable collaborated itinerarie" ON public.saved_itineraries;

CREATE POLICY "Users can update their own and collaborated itineraries"
ON public.saved_itineraries 
FOR UPDATE 
USING (
  -- User owns the itinerary
  auth.uid() = user_id 
  OR 
  -- User is an accepted collaborator with any permission level
  EXISTS (
    SELECT 1 FROM public.itinerary_collaborators ic
    WHERE ic.itinerary_id = saved_itineraries.id 
    AND ic.user_id = auth.uid() 
    AND ic.status = 'accepted'
  )
);