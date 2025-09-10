CREATE OR REPLACE FUNCTION public.get_user_itinerary_permissions(itinerary_uuid uuid, user_uuid uuid)
 RETURNS TABLE(can_view boolean, can_edit boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      -- Check if user owns this in saved_itineraries table
      WHEN EXISTS (
        SELECT 1 FROM public.saved_itineraries si 
        WHERE si.id = itinerary_uuid AND si.user_id = user_uuid
      ) THEN true
      -- Check if user owns this in trips table (for background generated itineraries)
      WHEN EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = itinerary_uuid AND t.user_id = user_uuid
      ) THEN true
      -- Check if user is a collaborator
      WHEN EXISTS (
        SELECT 1 FROM public.itinerary_collaborators ic
        WHERE ic.itinerary_id = itinerary_uuid 
        AND ic.user_id = user_uuid 
        AND ic.status = 'accepted'
      ) THEN true
      ELSE false
    END as can_view,
    CASE 
      -- Check if user owns this in saved_itineraries table
      WHEN EXISTS (
        SELECT 1 FROM public.saved_itineraries si 
        WHERE si.id = itinerary_uuid AND si.user_id = user_uuid
      ) THEN true
      -- Check if user owns this in trips table (for background generated itineraries)
      WHEN EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = itinerary_uuid AND t.user_id = user_uuid
      ) THEN true
      -- Check if user is a collaborator with edit permissions
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
$function$