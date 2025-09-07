-- Fix the RLS policies for saved_itineraries table
-- The current policies have incorrect join conditions

-- Drop the existing incorrect policies
DROP POLICY IF EXISTS "Users can update their own and editable collaborated itinerarie" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can view their own and collaborated itineraries" ON public.saved_itineraries;

-- Create correct SELECT policy
CREATE POLICY "Users can view their own and collaborated itineraries" 
ON public.saved_itineraries 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IN (
    SELECT itinerary_collaborators.user_id
    FROM itinerary_collaborators
    WHERE itinerary_collaborators.itinerary_id = saved_itineraries.id 
    AND itinerary_collaborators.status = 'accepted'
  ))
);

-- Create correct UPDATE policy
CREATE POLICY "Users can update their own and editable collaborated itineraries" 
ON public.saved_itineraries 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IN (
    SELECT itinerary_collaborators.user_id
    FROM itinerary_collaborators
    WHERE itinerary_collaborators.itinerary_id = saved_itineraries.id 
    AND itinerary_collaborators.status = 'accepted'
    AND itinerary_collaborators.permission IN ('edit', 'admin')
  ))
);