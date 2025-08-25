-- Add hashtags column to trips table
ALTER TABLE public.trips ADD COLUMN hashtags text[] DEFAULT '{}';

-- Create index for faster hashtag searches
CREATE INDEX idx_trips_hashtags ON public.trips USING GIN(hashtags);

-- Create index for faster location searches in stops JSONB
CREATE INDEX idx_trips_stops ON public.trips USING GIN(stops);

-- Create full text search index for trip titles
CREATE INDEX idx_trips_title_fts ON public.trips USING GIN(to_tsvector('english', title));

-- Create full text search index for profile names and usernames
CREATE INDEX idx_profiles_name_fts ON public.profiles USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(username, '')));