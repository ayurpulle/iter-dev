-- Create trip folders table
CREATE TABLE public.trip_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for trip folders
CREATE POLICY "Users can view their own folders" 
ON public.trip_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
ON public.trip_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.trip_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.trip_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add folder_id to saved_trips table
ALTER TABLE public.saved_trips 
ADD COLUMN folder_id UUID REFERENCES public.trip_folders(id) ON DELETE SET NULL;

-- Create trigger for folder timestamps
CREATE TRIGGER update_trip_folders_updated_at
BEFORE UPDATE ON public.trip_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();