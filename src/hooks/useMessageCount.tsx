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
        // Get all conversations where user is a participant
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .contains('participants', [user.id]);

        if (convError) throw convError;

        if (!conversations || conversations.length === 0) {
          setUnreadCount(0);
          return;
        }

        // Count unread messages across all conversations
        let totalUnread = 0;
        for (const conv of conversations) {
          const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          if (error) throw error;
          totalUnread += count || 0;
        }

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
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return unreadCount;
};