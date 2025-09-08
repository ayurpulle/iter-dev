-- Drop all existing policies on saved_itineraries
DROP POLICY IF EXISTS "Temporary save policy" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can view their own and collaborated itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can update their own and editable collaborated itinerarie" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can update their own and editable collaborated itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can delete their own saved itineraries" ON public.saved_itineraries;

-- Create proper INSERT policy  
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create SELECT policy - users can view their own itineraries and collaborated ones
CREATE POLICY "Users can view their own and collaborated itineraries" 
ON public.saved_itineraries 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM itinerary_collaborators ic
    WHERE ic.itinerary_id = saved_itineraries.id 
    AND ic.user_id = auth.uid() 
    AND ic.status = 'accepted'
  )
);

-- Create UPDATE policy - users can update their own itineraries and those they can edit
CREATE POLICY "Users can update their own and editable collaborated itineraries" 
ON public.saved_itineraries 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM itinerary_collaborators ic
    WHERE ic.itinerary_id = saved_itineraries.id 
    AND ic.user_id = auth.uid() 
    AND ic.status = 'accepted'
    AND ic.permission IN ('edit', 'admin')
  )
);

-- Create DELETE policy
CREATE POLICY "Users can delete their own saved itineraries" 
ON public.saved_itineraries 
FOR DELETE 
USING (auth.uid() = user_id);