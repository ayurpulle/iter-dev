-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view their own and collaborated itineraries" ON public.saved_itineraries;
DROP POLICY IF EXISTS "Users can update their own and editable collaborated itinerarie" ON public.saved_itineraries;

-- Create security definer function to check collaboration permissions
CREATE OR REPLACE FUNCTION public.get_user_itinerary_permissions(itinerary_uuid uuid, user_uuid uuid)
RETURNS TABLE(can_view boolean, can_edit boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.saved_itineraries si 
        WHERE si.id = itinerary_uuid AND si.user_id = user_uuid
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.itinerary_collaborators ic
        WHERE ic.itinerary_id = itinerary_uuid 
        AND ic.user_id = user_uuid 
        AND ic.status = 'accepted'
      ) THEN true
      ELSE false
    END as can_view,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.saved_itineraries si 
        WHERE si.id = itinerary_uuid AND si.user_id = user_uuid
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.itinerary_collaborators ic
        WHERE ic.itinerary_id = itinerary_uuid 
        AND ic.user_id = user_uuid 
        AND ic.status = 'accepted'
        AND ic.permission IN ('edit', 'admin')
      ) THEN true
      ELSE false
    END as can_edit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the SELECT policy using the security definer function
CREATE POLICY "Users can view their own and collaborated itineraries" 
ON public.saved_itineraries FOR SELECT 
USING (
  (SELECT can_view FROM public.get_user_itinerary_permissions(id, auth.uid()))
);

-- Recreate the UPDATE policy using the security definer function  
CREATE POLICY "Users can update their own and editable collaborated itineraries"
ON public.saved_itineraries FOR UPDATE
USING (
  (SELECT can_edit FROM public.get_user_itinerary_permissions(id, auth.uid()))
);