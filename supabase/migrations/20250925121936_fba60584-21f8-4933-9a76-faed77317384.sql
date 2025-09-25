-- Remove the old restrictive policy that was causing the RLS violation
DROP POLICY IF EXISTS "Users can invite collaborators to their itineraries" ON public.itinerary_collaborators;