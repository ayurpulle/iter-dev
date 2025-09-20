-- Add group chat support to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_group_chat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS group_name text,
ADD COLUMN IF NOT EXISTS group_description text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Update RLS policies to support group chats
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = ANY (participants));

DROP POLICY IF EXISTS "Users can create conversations they participate in" ON public.conversations;
CREATE POLICY "Users can create conversations they participate in" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = ANY (participants) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;
CREATE POLICY "Users can update conversations they participate in" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = ANY (participants));

-- Add constraint for group chat participant limit
ALTER TABLE public.conversations 
ADD CONSTRAINT check_group_chat_participants 
CHECK (
  (is_group_chat = false AND array_length(participants, 1) = 2) OR
  (is_group_chat = true AND array_length(participants, 1) BETWEEN 3 AND 6)
);