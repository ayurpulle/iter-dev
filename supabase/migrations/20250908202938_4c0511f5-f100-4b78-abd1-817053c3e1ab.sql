-- First drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can view their own and collaborated itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can update their own and editable collaborated itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can delete their own saved itineraries" ON public.saved_itineraries;

-- Recreate proper INSERT policy  
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Recreate proper SELECT policy using the existing function
CREATE POLICY "Users can view their own and collaborated itineraries" 
ON public.saved_itineraries 
FOR SELECT 
USING ((SELECT can_view FROM get_user_itinerary_permissions(saved_itineraries.id, auth.uid())));

-- Recreate proper UPDATE policy
CREATE POLICY "Users can update their own and editable collaborated itineraries" 
ON public.saved_itineraries 
FOR UPDATE 
USING ((SELECT can_edit FROM get_user_itinerary_permissions(saved_itineraries.id, auth.uid())));

-- Recreate proper DELETE policy
CREATE POLICY "Users can delete their own saved itineraries" 
ON public.saved_itineraries 
FOR DELETE 
USING (auth.uid() = user_id);