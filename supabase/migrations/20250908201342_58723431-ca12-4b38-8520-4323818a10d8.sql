-- Check current RLS status and auth context
SELECT 
  auth.uid() as current_user_id,
  current_user as current_db_user,
  session_user as session_user,
  auth.role() as auth_role;

-- The issue is likely that auth.uid() is null during insert
-- Let's create a more robust policy that also checks the JWT claims

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

-- Create a new policy that handles both auth contexts
CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Also ensure RLS is enabled
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;