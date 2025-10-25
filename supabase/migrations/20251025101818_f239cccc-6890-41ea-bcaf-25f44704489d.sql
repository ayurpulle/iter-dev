-- Create fabric_connections table for storing OAuth tokens and connection state
CREATE TABLE public.fabric_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp with time zone,
  fabric_user_id text,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_synced_at timestamp with time zone,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.fabric_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own fabric connections
CREATE POLICY "Users can view their own fabric connections"
ON public.fabric_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own fabric connections
CREATE POLICY "Users can insert their own fabric connections"
ON public.fabric_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own fabric connections
CREATE POLICY "Users can update their own fabric connections"
ON public.fabric_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own fabric connections
CREATE POLICY "Users can delete their own fabric connections"
ON public.fabric_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fabric_connections_updated_at
BEFORE UPDATE ON public.fabric_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_fabric_connections_user_id ON public.fabric_connections(user_id);
CREATE INDEX idx_fabric_connections_status ON public.fabric_connections(status);