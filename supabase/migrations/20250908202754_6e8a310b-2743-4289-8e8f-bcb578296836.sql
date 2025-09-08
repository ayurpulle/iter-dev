-- Restore proper RLS policies for saved_itineraries

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
USING ( SELECT get_user_itinerary_permissions.can_view
   FROM get_user_itinerary_permissions(saved_itineraries.id, auth.uid()) get_user_itinerary_permissions(can_view, can_edit));

-- Restore proper UPDATE policy
CREATE POLICY "Users can update their own and editable collaborated itineraries" 
ON public.saved_itineraries 
FOR UPDATE 
USING ( SELECT get_user_itinerary_permissions.can_edit
   FROM get_user_itinerary_permissions(saved_itineraries.id, auth.uid()) get_user_itinerary_permissions(can_view, can_edit));

-- Restore proper DELETE policy
CREATE POLICY "Users can delete their own saved itineraries" 
ON public.saved_itineraries 
FOR DELETE 
USING (auth.uid() = user_id);