import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  profiles?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get mutual friends (someone you follow that follows you back)
  const fetchMutualFriends = async () => {
    if (!user) return;

    try {
      // Get users where you follow them
      const { data: followingData, error: followingError } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (followingError) throw followingError;

      // Filter for mutual friends
      const mutualFriends: Friend[] = [];
      
      for (const friend of followingData || []) {
        // Check if they also follow you back
        const { data: reverseFollow, error: reverseError } = await supabase
          .from('friends')
          .select('id')
          .eq('user_id', friend.friend_id)
          .eq('friend_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!reverseError && reverseFollow) {
          // Get the friend's profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, username, avatar')
            .eq('user_id', friend.friend_id)
            .single();

          mutualFriends.push({
            ...friend,
            profiles: profileData || undefined
          } as Friend);
        }
      }

      setFriends(mutualFriends);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMutualFriends();
  }, [user]);

  return {
    friends,
    loading,
    error,
    refetch: fetchMutualFriends,
  };
};