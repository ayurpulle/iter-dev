import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'follow' | 'trip_like' | 'itinerary_invite';
  title: string;
  message: string;
  read: boolean;
  related_user_id?: string;
  related_trip_id?: string;
  related_comment_id?: string;
  friend_request_id?: string;
  data?: any;
  created_at: string;
  profiles?: {
    name: string;
    username: string;
    avatar: string;
  };
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Manually fetch profile data for related users
      const notificationsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          let profile = undefined;
          if (item.related_user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name, username, avatar')
              .eq('user_id', item.related_user_id)
              .maybeSingle();
            profile = profileData;
          }

          return {
            id: item.id,
            type: item.type as Notification['type'],
            title: item.title,
            message: item.message,
            read: item.read,
            related_user_id: item.related_user_id,
            related_trip_id: item.related_trip_id,
            related_comment_id: item.related_comment_id,
            friend_request_id: item.friend_request_id,
            data: item.data,
            created_at: item.created_at,
            profiles: profile
          };
        })
      );
      
      setNotifications(notificationsWithProfiles);
      
      // Count unread notifications
      const unread = notificationsWithProfiles.filter(n => !n.read).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications(); // Reload when new notifications arrive
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications(); // Reload when notifications are updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
};