-- Add unique constraint to username field and make it not nullable
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_username UNIQUE (username);

-- Update the username field to be not nullable (after adding constraint)
-- Note: We'll handle the NOT NULL constraint in the application logic since existing users might have null usernames