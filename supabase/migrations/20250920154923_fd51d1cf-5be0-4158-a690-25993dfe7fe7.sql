-- Fix the INSERT policy for itinerary_collaborators table
DROP POLICY IF EXISTS "Users can invite collaborators to their itineraries" ON public.itinerary_collaborators;

CREATE POLICY "Users can invite collaborators to their itineraries" 
ON public.itinerary_collaborators 
FOR INSERT 
WITH CHECK (
  -- User can invite others to itineraries they own
  auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.saved_itineraries 
    WHERE id = itinerary_id AND user_id = auth.uid()
  )
  -- OR for trips table (background generated itineraries)
  OR (
    auth.uid() = invited_by 
    AND EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = itinerary_id AND user_id = auth.uid()
    )
  )
);