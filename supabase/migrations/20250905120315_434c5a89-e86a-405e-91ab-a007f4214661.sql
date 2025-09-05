-- Add foreign key constraints for data integrity
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_related_comment_id_fkey 
FOREIGN KEY (related_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add related_like_id column for post like notifications
ALTER TABLE public.notifications 
ADD COLUMN related_like_id UUID REFERENCES public.post_likes(id) ON DELETE CASCADE;

-- Add related_post_id for direct post references
ALTER TABLE public.notifications 
ADD COLUMN related_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;