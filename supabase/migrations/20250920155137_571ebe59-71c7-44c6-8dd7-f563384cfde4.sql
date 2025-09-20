-- Remove the existing foreign key constraint since we handle validation in RLS policies
-- This allows collaborations on both saved_itineraries and trips tables
ALTER TABLE public.itinerary_collaborators 
DROP CONSTRAINT IF EXISTS itinerary_collaborators_itinerary_id_fkey;

-- Add a check to ensure itinerary_id exists in either saved_itineraries or trips
-- Using a function to validate the reference
CREATE OR REPLACE FUNCTION public.validate_itinerary_exists(itinerary_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saved_itineraries WHERE id = itinerary_uuid
    UNION
    SELECT 1 FROM public.trips WHERE id = itinerary_uuid
  );
$$;

-- Add a trigger to validate itinerary exists before insert/update
CREATE OR REPLACE FUNCTION public.check_itinerary_collaborator_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_itinerary_exists(NEW.itinerary_id) THEN
    RAISE EXCEPTION 'Referenced itinerary does not exist in saved_itineraries or trips tables';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_itinerary_collaborator_reference ON public.itinerary_collaborators;

-- Create trigger
CREATE TRIGGER validate_itinerary_collaborator_reference
  BEFORE INSERT OR UPDATE ON public.itinerary_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.check_itinerary_collaborator_reference();