-- Create a function that saves itineraries with proper auth context
CREATE OR REPLACE FUNCTION save_user_itinerary(
  p_title text,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_budget integer,
  p_interests text[],
  p_itinerary_content text,
  p_friend_recommendations jsonb
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_itinerary_id uuid;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Insert the itinerary
  INSERT INTO public.saved_itineraries (
    user_id, title, destination, start_date, end_date,
    budget, interests, itinerary_content, friend_recommendations
  ) VALUES (
    v_user_id, p_title, p_destination, p_start_date, p_end_date,
    p_budget, p_interests, p_itinerary_content, p_friend_recommendations
  ) RETURNING id INTO v_itinerary_id;
  
  RETURN v_itinerary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;