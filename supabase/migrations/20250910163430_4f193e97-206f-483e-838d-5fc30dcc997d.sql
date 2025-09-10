-- Update trips RLS policy to show private trips to user and their followers
DROP POLICY IF EXISTS "Users can view public trips" ON public.trips;

CREATE POLICY "Users can view public trips and own trips and followed users trips" 
ON public.trips 
FOR SELECT 
USING (
  (is_public = true) 
  OR (auth.uid() = user_id)
  OR (
    -- User is following the trip creator
    auth.uid() IN (
      SELECT f.user_id 
      FROM public.friends f 
      WHERE f.friend_id = trips.user_id 
        AND f.status = 'accepted'
    )
  )
);