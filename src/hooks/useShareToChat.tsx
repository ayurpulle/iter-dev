import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useShareToChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const shareToChat = async (
    friendId: string, 
    itemType: 'itinerary' | 'post', 
    itemId: string, 
    itemTitle: string,
    content?: string
  ) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to share items",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    try {
      // Find or create conversation
      let conversationId = null;
      
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id])
        .contains('participants', [friendId])
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participants: [user.id, friendId],
            last_message: `Shared ${itemType}: ${itemTitle}`,
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Create share message
      let shareMessage = '';
      if (itemType === 'itinerary') {
        shareMessage = `🗺️ I shared an itinerary with you: "${itemTitle}"`;
      } else {
        shareMessage = `📸 I shared a post with you: "${itemTitle}"`;
        if (content) shareMessage += `\n\n${content}`;
      }

      // Send the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: shareMessage
        });

      if (messageError) throw messageError;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: shareMessage,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      toast({
        title: "Shared Successfully!",
        description: `${itemType === 'itinerary' ? 'Itinerary' : 'Post'} shared to chat with your friend.`
      });

      return true;
    } catch (error: any) {
      console.error('Error sharing to chat:', error);
      toast({
        title: "Share Failed",
        description: error.message || "Failed to share. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    shareToChat,
    loading
  };
};