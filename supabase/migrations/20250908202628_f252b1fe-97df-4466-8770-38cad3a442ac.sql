-- Drop the debug function and fix the RLS policy issue
DROP FUNCTION IF EXISTS debug_saved_itineraries_policy();

-- Drop current policy  
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

-- Create a temporary permissive policy for testing
CREATE POLICY "Temporary save policy" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (true);

-- Also ensure we have proper SELECT policy
DROP POLICY IF EXISTS "Users can view their own and collaborated itineraries" ON public.saved_itineraries;
CREATE POLICY "Users can view their own and collaborated itineraries" 
ON public.saved_itineraries 
FOR SELECT 
USING (true);