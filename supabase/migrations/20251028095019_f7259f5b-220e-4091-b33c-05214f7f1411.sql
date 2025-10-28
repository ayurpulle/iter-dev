-- Create google_search_summaries table
CREATE TABLE public.google_search_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  summary_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create google_search_raw_threads table
CREATE TABLE public.google_search_raw_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fabric_item_id TEXT NOT NULL,
  provider TEXT,
  data_type TEXT,
  data_subtype TEXT,
  interaction_type TEXT,
  preview TEXT,
  payload JSONB,
  asat TIMESTAMP WITH TIME ZONE,
  content TEXT,
  details JSONB,
  version TEXT,
  provider_connection_id TEXT,
  is_pii BOOLEAN DEFAULT false,
  is_health_related BOOLEAN DEFAULT false,
  is_pornographic BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fabric_item_id)
);

-- Create instagram_interactions table
CREATE TABLE public.instagram_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fabric_item_id TEXT NOT NULL,
  interaction_type TEXT,
  preview TEXT,
  payload JSONB,
  asat TIMESTAMP WITH TIME ZONE,
  content TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fabric_item_id)
);

-- Create instagram_general table
CREATE TABLE public.instagram_general (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  data_type TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_search_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_search_raw_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_general ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_search_summaries
CREATE POLICY "Users can view their own search summaries"
ON public.google_search_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search summaries"
ON public.google_search_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search summaries"
ON public.google_search_summaries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search summaries"
ON public.google_search_summaries FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for google_search_raw_threads
CREATE POLICY "Users can view their own search threads"
ON public.google_search_raw_threads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search threads"
ON public.google_search_raw_threads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search threads"
ON public.google_search_raw_threads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search threads"
ON public.google_search_raw_threads FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for instagram_interactions
CREATE POLICY "Users can view their own instagram interactions"
ON public.instagram_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own instagram interactions"
ON public.instagram_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instagram interactions"
ON public.instagram_interactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instagram interactions"
ON public.instagram_interactions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for instagram_general
CREATE POLICY "Users can view their own instagram general data"
ON public.instagram_general FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own instagram general data"
ON public.instagram_general FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instagram general data"
ON public.instagram_general FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instagram general data"
ON public.instagram_general FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_google_search_summaries_user_date ON public.google_search_summaries(user_id, summary_date DESC);
CREATE INDEX idx_google_search_raw_threads_user_asat ON public.google_search_raw_threads(user_id, asat DESC);
CREATE INDEX idx_instagram_interactions_user_asat ON public.instagram_interactions(user_id, asat DESC);
CREATE INDEX idx_instagram_general_user_created ON public.instagram_general(user_id, created_at DESC);

-- Create triggers for updating updated_at timestamps
CREATE TRIGGER update_google_search_summaries_updated_at
BEFORE UPDATE ON public.google_search_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_search_raw_threads_updated_at
BEFORE UPDATE ON public.google_search_raw_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_interactions_updated_at
BEFORE UPDATE ON public.instagram_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_general_updated_at
BEFORE UPDATE ON public.instagram_general
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();