-- Delete existing summaries for ayur user
DELETE FROM public.google_search_summaries 
WHERE user_id = '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7';

-- Insert Google search summaries for ayur user
INSERT INTO public.google_search_summaries (id, user_id, summary_date, summary_content, metadata)
VALUES
  ('02f5ea86-9f89-4def-b30b-05be4b3175cd', '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7', '2025-10-22', 
   'The user exhibits strong and consistent engagement with travel planning focused on Italy, Japan, and France, with particular emphasis on authentic culinary experiences. Italy Travel is a dominant interest, with daily activity in Rome (Trastevere restaurants, Monti hotels, trattorias), Florence & Tuscany (Florentine cuisine, Chianti wine tours), and Venice (Rialto Market, bacari wine bars). Japanese Cuisine & Culture shows deep interest in Japanese food via YouTube channels and searches for specific restaurants, complemented by cultural research. French Gastronomy pursuits focus on Paris and Lyon boulangeries, bistros, and markets. The user also displays practical travel planning with hotel research, transportation options, and travel gear, plus interest in specialized food experiences like cooking classes and food tours.',
   '{"provider": "google", "provider_connection_id": "7766fb9f-9f7f-465d-b57b-d8c021274f73", "from_date": "2025-10-15T00:00:00", "to_date": "2025-10-22T00:00:00"}'::jsonb),
  
  ('8f173bbc-fe34-488a-b968-76c1b3557467', '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7', '2025-10-15',
   'The user demonstrates focused interest in Barcelona and Madrid travel planning, with strong emphasis on Spanish cuisine, particularly tapas culture and Basque gastronomy. Searches revolve around Barcelona neighborhoods (El Born, Gothic Quarter, Gràcia, Barceloneta) and Spanish culinary experiences (Cal Pep, Tickets tapas, pintxos bars San Sebastian). Significant research into Gaudí architecture (Sagrada Familia, Park Güell, Casa Batlló) and day trips. Madrid interests include museums (Prado, Reina Sofia), parks, and flamenco shows.',
   '{"provider": "google", "provider_connection_id": "7766fb9f-9f7f-465d-b57b-d8c021274f73", "from_date": "2025-10-08T00:00:00", "to_date": "2025-10-15T00:00:00"}'::jsonb),

  ('5193ad5a-ac24-451a-b74f-b7fb935d2e3e', '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7', '2025-10-08',
   'Extensive interest in planning a comprehensive Japan trip focusing on Tokyo, Kyoto, and Osaka. Tokyo exploration includes neighborhoods (Shibuya, Harajuku, Shinjuku, Akihabara) and cuisine (ramen, sushi). Kyoto & Nara research covers traditional culture (temples, geisha districts, ryokan). Osaka food scene features street food and local specialties. Extensive practical travel planning for transportation (JR Pass, Shinkansen), cultural preparation, and cherry blossom planning. Interest in travel photography and documentation.',
   '{"provider": "google", "provider_connection_id": "7766fb9f-9f7f-465d-b57b-d8c021274f73", "from_date": "2025-10-01T00:00:00", "to_date": "2025-10-08T00:00:00"}'::jsonb),

  ('0aeca9f9-444f-4e68-869c-1cf38e09cbb4', '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7', '2025-10-01',
   'Detailed planning for Portugal trip with deep focus on Lisbon, Porto, and Algarve region, emphasizing Portuguese cuisine and wine culture. Lisbon deep dive includes neighborhoods and culinary interests (Time Out Market, seafood, pastéis de nata). Porto & Douro Valley shows strong wine interest (port wine cellars, wine tours). Algarve coast research covers beaches and water activities. Deep interest in Portuguese gastronomy, practical transportation planning, day trips to Sintra and other nearby destinations, and cultural experiences like Fado music.',
   '{"provider": "google", "provider_connection_id": "7766fb9f-9f7f-465d-b57b-d8c021274f73", "from_date": "2025-09-24T00:00:00", "to_date": "2025-10-01T00:00:00"}'::jsonb),

  ('04b62e55-84cc-46b8-9276-2af115411168', '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7', '2025-09-24',
   'Focused interest in Southeast Asian travel, particularly Thailand and Vietnam, with emphasis on street food culture and beach destinations. Bangkok & Thai cuisine shows clear interest in Thai food and street markets. Chiang Mai & Northern Thailand research includes temples, cooking classes, and ethical elephant sanctuaries. Vietnamese food & culture features extensive Hanoi and Ho Chi Minh City searches. Thai islands & beaches include diving and beach destinations. Ha Long Bay & Hoi An specific interests. Budget travel & backpacking practical information.',
   '{"provider": "google", "provider_connection_id": "7766fb9f-9f7f-465d-b57b-d8c021274f73", "from_date": "2025-09-17T00:00:00", "to_date": "2025-09-24T00:00:00"}'::jsonb);