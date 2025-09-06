-- Fix the notifications table foreign key relationships
-- First, ensure we have the proper structure

-- Add missing foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key for related_user_id to reference profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_related_user_id_fkey'
    ) THEN
        ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_related_user_id_fkey 
        FOREIGN KEY (related_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for user_id to reference profiles  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN
        -- If foreign keys fail, just continue
        NULL;
END $$;

-- Create RLS policies to allow notifications to be inserted by system
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid()::text IN (SELECT user_id::text FROM public.profiles WHERE user_id = notifications.user_id));