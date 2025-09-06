-- First, add a unique constraint on profiles.user_id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Now create the foreign key relationship between trips.user_id and profiles.user_id
ALTER TABLE public.trips 
ADD CONSTRAINT trips_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;