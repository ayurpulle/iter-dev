-- Create saved_itineraries table
CREATE TABLE public.saved_itineraries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  destination text NOT NULL,
  start_date date,
  end_date date,
  budget integer,
  interests text[],
  itinerary_content text NOT NULL,
  friend_recommendations jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_itineraries
CREATE POLICY "Users can view their own saved itineraries"
ON public.saved_itineraries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved itineraries"
ON public.saved_itineraries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved itineraries"
ON public.saved_itineraries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved itineraries"
ON public.saved_itineraries
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_saved_itineraries_updated_at
BEFORE UPDATE ON public.saved_itineraries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();