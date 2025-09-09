import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useMessageCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      console.log('Fetching unread count for user:', user.id);
      
      // Use the RPC function for notifications as fallback pattern
      try {
        const { data, error } = await supabase.rpc('get_unread_notification_count', {
          user_uuid: user.id
        });
        
        if (!error && typeof data === 'number') {
          // This is just to test RPC functionality - we'll use manual count for messages
          console.log('RPC works, proceeding with manual message count');
        }
      } catch (rpcError) {
        console.log('RPC failed, using manual count:', rpcError);
      }

      // Fallback to manual counting
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id]);

      if (convError) throw convError;

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        return;
      }

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

      console.log('Total unread messages:', totalUnread);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching message count:', error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Message change detected:', payload);
          setTimeout(fetchUnreadCount, 200);
        }
      )
      .subscribe();

    // Listen for manual updates
    const handleMessageCountUpdate = () => {
      console.log('Manual message count update triggered');
      fetchUnreadCount();
    };
    
    window.addEventListener('messageCountUpdate', handleMessageCountUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('messageCountUpdate', handleMessageCountUpdate);
    };
  }, [user?.id]);

  return unreadCount;
};