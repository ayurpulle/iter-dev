-- Temporarily disable RLS to test if that fixes the save issue
ALTER TABLE public.saved_itineraries DISABLE ROW LEVEL SECURITY;

-- Test what auth.uid() returns in different contexts
SELECT 
  auth.uid() as current_user_id,
  current_user as db_user;