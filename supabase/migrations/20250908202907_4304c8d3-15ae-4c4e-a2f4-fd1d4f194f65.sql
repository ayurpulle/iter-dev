-- Restore proper RLS policies for saved_itineraries with correct syntax

-- Drop temporary permissive policies
DROP POLICY IF EXISTS "Temporary save policy" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can view their own and collaborated itineraries" ON public.saved_itineraries;

-- Restore proper INSERT policy  
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Restore proper SELECT policy using the existing function
CREATE POLICY "Users can view their own and collaborated itineraries" 
ON public.saved_itineraries 
FOR SELECT 
USING ((SELECT can_view FROM get_user_itinerary_permissions(saved_itineraries.id, auth.uid())));

-- Restore proper UPDATE policy
CREATE POLICY "Users can update their own and editable collaborated itineraries" 
ON public.saved_itineraries 
FOR UPDATE 
USING ((SELECT can_edit FROM get_user_itinerary_permissions(saved_itineraries.id, auth.uid())));

-- Restore proper DELETE policy
CREATE POLICY "Users can delete their own saved itineraries" 
ON public.saved_itineraries 
FOR DELETE 
USING (auth.uid() = user_id);