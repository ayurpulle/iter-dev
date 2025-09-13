-- Add foreign key constraint between trips.user_id and profiles.user_id
ALTER TABLE public.trips 
ADD CONSTRAINT trips_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;