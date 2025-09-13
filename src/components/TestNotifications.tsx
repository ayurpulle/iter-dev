import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const TestNotifications = () => {
  const { user } = useAuth();

  const createTestNotification = async () => {
    if (!user) {
      console.log('No user found!');
      return;
    }

    console.log('Creating test notification for user:', user.id);
    
    try {
      const { data, error } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'like',
        title: 'Test Like',
        message: 'Someone liked your test post',
        related_user_id: user.id
      }).select();
      
      if (error) {
        console.error('Supabase error:', error);
        return;
      }
      
      console.log('Test notification created successfully!', data);
    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  };

  const createItineraryNotification = async () => {
    if (!user) {
      console.log('No user found!');
      return;
    }

    console.log('Creating itinerary notification for user:', user.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-notification', {
        body: {
          type: 'itinerary_complete',
          title: 'Itinerary Ready!',
          message: 'Your Paris, France itinerary has been generated and saved.',
          data: { 
            tripId: '23527b0a-2360-4ae6-8baa-2ffd359cd428', 
            destination: 'Paris, France' 
          }
        }
      });
      
      if (error) {
        console.error('Function error:', error);
        return;
      }
      
      console.log('Itinerary notification created successfully!', data);
    } catch (error) {
      console.error('Error creating itinerary notification:', error);
    }
  };

  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg mb-4">
      <p className="text-sm text-gray-600 mb-2">Debug: Test Notifications</p>
      <p className="text-xs text-gray-500 mb-2">User ID: {user?.id || 'Not logged in'}</p>
      <Button onClick={createTestNotification} disabled={!user} className="mr-2">
        Create Test Notification
      </Button>
      <Button onClick={createItineraryNotification} disabled={!user}>
        Create Paris Itinerary Notification
      </Button>
    </div>
  );
};

export default TestNotifications;