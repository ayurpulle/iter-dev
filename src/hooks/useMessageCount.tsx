import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useMessageCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      try {
        console.log('Fetching unread count for user:', user.id);
        // Get all conversations where user is a participant
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .contains('participants', [user.id]);

        if (convError) throw convError;
        console.log('Found conversations:', conversations);

        if (!conversations || conversations.length === 0) {
          console.log('No conversations found');
          setUnreadCount(0);
          return;
        }

        // Count unread messages across all conversations where current user is not the sender
        let totalUnread = 0;
        for (const conv of conversations) {
          const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          if (error) throw error;
          console.log(`Conversation ${conv.id}: ${count} unread messages`);
          totalUnread += count || 0;
        }

        console.log('Total unread messages:', totalUnread);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching message count:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates for messages
    const channel = supabase
      .channel('messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          console.log('Messages changed, refetching count');
          setTimeout(fetchUnreadCount, 100); // Small delay to ensure DB is updated
        }
      )
      .subscribe();

    // Listen for manual message count updates
    const handleMessageCountUpdate = () => {
      console.log('Manual message count update triggered');
      setTimeout(fetchUnreadCount, 100);
    };
    
    window.addEventListener('messageCountUpdate', handleMessageCountUpdate);

    const markConversationAsRead = async (conversationId: string) => {
      if (!user?.id) return;
      
      try {
        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .is('read_at', null);

        if (error) throw error;
        
        // Force refetch of unread count
        setTimeout(fetchUnreadCount, 100);
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    };

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('messageCountUpdate', handleMessageCountUpdate);
    };
  }, [user?.id]);

  return unreadCount;
};