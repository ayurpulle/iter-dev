import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNotificationCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      try {
        console.log('Fetching unread count for user:', user.id);
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        if (error) throw error;
        console.log('Unread count:', count);
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates for notifications
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Real-time notification change detected!');
          fetchUnreadCount();
        }
      )
      .subscribe();

    console.log('Subscribed to notification changes for user:', user.id);

    return () => {
      console.log('Unsubscribing from notification changes');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return unreadCount;
};