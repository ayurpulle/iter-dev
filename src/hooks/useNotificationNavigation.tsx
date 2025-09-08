import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useNotificationNavigation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const navigateToPost = async (notificationId: string, postId: string) => {
    try {
      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      // Navigate to a post view page (we'll need to create this)
      navigate(`/post/${postId}`);
    } catch (error) {
      console.error('Error navigating to post:', error);
      toast({
        title: "Error",
        description: "Failed to open post",
        variant: "destructive",
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return {
    navigateToPost,
    markAsRead
  };
};