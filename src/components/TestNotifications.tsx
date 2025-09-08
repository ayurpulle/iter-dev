import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const TestNotifications = () => {
  const { user } = useAuth();

  const createTestNotification = async () => {
    if (!user) return;

    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'like',
        title: 'Test Like',
        message: 'Someone liked your test post',
        related_user_id: user.id,
        related_post_id: 'test-post-id',
        related_like_id: 'test-like-id'
      });
      
      console.log('Test notification created!');
    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  };

  return (
    <div className="p-4">
      <Button onClick={createTestNotification}>
        Create Test Notification
      </Button>
    </div>
  );
};

export default TestNotifications;