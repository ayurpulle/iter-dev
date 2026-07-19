-- Remove the onFabric integration: connection tokens and all imported
-- Google search / Instagram history synced or hand-imported via Fabric exports.
DROP TABLE IF EXISTS public.fabric_connections;
DROP TABLE IF EXISTS public.google_search_raw_threads;
DROP TABLE IF EXISTS public.google_search_summaries;
DROP TABLE IF EXISTS public.instagram_general;
DROP TABLE IF EXISTS public.instagram_interactions;
