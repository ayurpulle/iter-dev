-- Create RPC function for getting unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_unread INTEGER := 0;
  conv_record RECORD;
BEGIN
  -- Get all conversations where user is a participant
  FOR conv_record IN 
    SELECT id 
    FROM conversations 
    WHERE user_uuid = ANY(participants)
  LOOP
    -- Count unread messages for each conversation
    SELECT COALESCE(COUNT(*), 0) + total_unread INTO total_unread
    FROM messages 
    WHERE conversation_id = conv_record.id 
      AND sender_id != user_uuid 
      AND read_at IS NULL;
  END LOOP;
  
  RETURN total_unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;