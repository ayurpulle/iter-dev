-- Create a new policy that allows both inviting and accepting invitations
CREATE POLICY "Allow collaboration invites and acceptance" 
ON public.itinerary_collaborators
FOR INSERT 
WITH CHECK (
  -- Either the user is the itinerary owner inviting someone
  (
    auth.uid() = invited_by 
    AND (
      EXISTS (
        SELECT 1 FROM saved_itineraries 
        WHERE saved_itineraries.id = itinerary_collaborators.itinerary_id 
        AND saved_itineraries.user_id = auth.uid()
      ) 
      OR EXISTS (
        SELECT 1 FROM trips 
        WHERE trips.id = itinerary_collaborators.itinerary_id 
        AND trips.user_id = auth.uid()
      )
    )
  )
  -- OR the user is accepting an invitation for themselves
  OR (
    auth.uid() = user_id 
    AND invited_by IS NOT NULL 
    AND invited_by != auth.uid()
  )
);