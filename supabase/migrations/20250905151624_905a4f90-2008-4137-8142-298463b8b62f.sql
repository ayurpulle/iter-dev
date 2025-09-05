-- Add foreign key relationship between trips and profiles
ALTER TABLE public.trips 
ADD CONSTRAINT trips_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);