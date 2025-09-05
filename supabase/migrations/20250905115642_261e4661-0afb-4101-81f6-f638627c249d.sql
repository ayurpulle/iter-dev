-- Create unified saved items table
CREATE TABLE public.saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('post', 'trip')),
  folder_id UUID REFERENCES public.trip_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable RLS on saved_items
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_items
CREATE POLICY "Users can save items" 
ON public.saved_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave items" 
ON public.saved_items 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own saved items" 
ON public.saved_items 
FOR SELECT 
USING (auth.uid() = user_id);

-- Rename trip_folders to item_folders for generic use
ALTER TABLE public.trip_folders RENAME TO item_folders;

-- Update folder policies to reflect new name
DROP POLICY "Users can view their own folders" ON public.item_folders;
DROP POLICY "Users can create their own folders" ON public.item_folders;
DROP POLICY "Users can update their own folders" ON public.item_folders;
DROP POLICY "Users can delete their own folders" ON public.item_folders;

CREATE POLICY "Users can view their own folders" 
ON public.item_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
ON public.item_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.item_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.item_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update trigger name
DROP TRIGGER update_trip_folders_updated_at ON public.item_folders;
CREATE TRIGGER update_item_folders_updated_at
BEFORE UPDATE ON public.item_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from saved_trips
INSERT INTO public.saved_items (user_id, item_id, item_type, folder_id, created_at)
SELECT user_id, trip_id, 'trip', folder_id, created_at
FROM public.saved_trips;

-- Migrate existing data from saved_posts  
INSERT INTO public.saved_items (user_id, item_id, item_type, folder_id, created_at)
SELECT user_id, post_id, 'post', NULL, created_at
FROM public.saved_posts;

-- Update foreign key constraint to point to item_folders
ALTER TABLE public.saved_items 
DROP CONSTRAINT saved_items_folder_id_fkey,
ADD CONSTRAINT saved_items_folder_id_fkey 
FOREIGN KEY (folder_id) REFERENCES public.item_folders(id) ON DELETE SET NULL;

-- Drop old tables
DROP TABLE public.saved_trips;
DROP TABLE public.saved_posts;