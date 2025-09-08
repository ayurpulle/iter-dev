-- Fix RLS policy for saved_itineraries INSERT
DROP POLICY IF EXISTS "Users can create their own saved itineraries" ON public.saved_itineraries;

CREATE POLICY "Users can create their own saved itineraries" 
ON public.saved_itineraries FOR INSERT 
WITH CHECK (auth.uid() = user_id);