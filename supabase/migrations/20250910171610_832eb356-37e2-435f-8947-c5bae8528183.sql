-- Enable real-time updates for saved_items table
ALTER TABLE public.saved_items REPLICA IDENTITY FULL;

-- Add saved_items to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_items;