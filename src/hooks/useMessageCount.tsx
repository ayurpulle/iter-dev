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
      
      // Use the new RPC function
      const { data, error } = await supabase.rpc('get_unread_message_count', {
        user_uuid: user.id
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw error;
      }
      
      console.log('Got unread count from RPC:', data);
      setUnreadCount(data || 0);
      return;

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