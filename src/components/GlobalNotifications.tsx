import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const GlobalNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkForItineraryNotifications = async () => {
      try {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['itinerary_complete', 'itinerary_error'])
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (notifications && notifications.length > 0) {
          const notification = notifications[0];
          
          // Only show if it's a new notification
          if (notification.id !== lastNotificationId) {
            setLastNotificationId(notification.id);
            
            if (notification.type === 'itinerary_complete') {
              const itineraryId = (notification.data as any)?.tripId;
              toast.success(notification.title, {
                description: notification.message,
                duration: 8000, // Show for 8 seconds
                action: {
                  label: 'View',
                  onClick: () => {
                    navigate('/search');
                  },
                },
              });
            } else if (notification.type === 'itinerary_error') {
              toast.error(notification.title, {
                description: notification.message,
                action: {
                  label: 'Try Again',
                  onClick: () => {
                    // Just close the toast, user can retry manually
                    // No navigation needed
                  },
                },
                duration: 8000, // Show for 8 seconds
              });
            }

            // Mark notification as read
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notification.id);
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Check immediately
    checkForItineraryNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('itinerary-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Real-time notification received:', payload);
          const notification = payload.new;
          
          if (notification.type === 'itinerary_complete') {
            const itineraryId = (notification.data as any)?.tripId;
            toast.success(notification.title, {
              description: notification.message,
              duration: 8000,
              action: {
                label: 'View',
                onClick: () => {
                  navigate('/search');
                },
              },
            });
            
            // Mark as read
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notification.id);
              
          } else if (notification.type === 'itinerary_error') {
            toast.error(notification.title, {
              description: notification.message,
              action: {
                label: 'Try Again',
                onClick: () => {
                  // Just close the toast, user can retry manually
                  // No navigation needed
                },
              },
              duration: 8000,
            });
            
            // Mark as read
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notification.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification channel status:', status);
      });

    // Periodic check every 30 seconds as backup
    const interval = setInterval(checkForItineraryNotifications, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, navigate, lastNotificationId]);

  return null; // This component doesn't render anything, just handles notifications
};

export default GlobalNotifications;