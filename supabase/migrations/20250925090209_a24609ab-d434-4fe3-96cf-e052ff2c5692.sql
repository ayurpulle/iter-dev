-- Fix the RLS policy for itinerary_collaborators table
-- The current USING check is preventing invitations from being created properly

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can invite collaborators to their itineraries" ON public.itinerary_collaborators;

-- Create a corrected policy that properly allows owners to invite collaborators
CREATE POLICY "Users can invite collaborators to their itineraries"
ON public.itinerary_collaborators
FOR INSERT
WITH CHECK (
  auth.uid() = invited_by AND (
    -- Check ownership in saved_itineraries
    EXISTS (
      SELECT 1 FROM public.saved_itineraries 
      WHERE id = itinerary_id AND user_id = auth.uid()
    ) OR
    -- Check ownership in trips table
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = itinerary_id AND user_id = auth.uid()
    )
  )
);