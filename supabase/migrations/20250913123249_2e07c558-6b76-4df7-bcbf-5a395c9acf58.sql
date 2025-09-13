-- Add tagged_friends column to trips table to store user IDs of tagged friends
ALTER TABLE public.trips ADD COLUMN tagged_friends TEXT[];

-- Create trip_tags table to store individual trip-friend relationships
CREATE TABLE public.trip_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, tagged_user_id)
);

-- Enable RLS on trip_tags table
ALTER TABLE public.trip_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_tags
CREATE POLICY "Users can view trip tags they are involved in" 
ON public.trip_tags 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = tagged_user_id);

CREATE POLICY "Users can create trip tags for their own trips" 
ON public.trip_tags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete trip tags for their own trips" 
ON public.trip_tags 
FOR DELETE 
USING (auth.uid() = user_id);