import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  };
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMutualFriends = async () => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get accepted friend relationships where current user is involved
      const { data: friendships, error: friendError } = await supabase
        .from('friends')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendError) throw friendError;

      // Get profile data for each friend
      const friendsWithProfiles = await Promise.all(
        (friendships || []).map(async (friendship) => {
          const otherUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .eq('user_id', otherUserId)
            .single();

          return {
            ...friendship,
            profile: profile || null
          };
        })
      );

      setFriends(friendsWithProfiles as Friend[]);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) throw new Error('User not authenticated');

    // Check if the target user has a public profile
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_public')
      .eq('user_id', friendId)
      .single();

    const isPublic = targetProfile?.is_public || false;

    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: isPublic ? 'accepted' : 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Only create notification for private accounts (pending requests)
    if (!isPublic) {
      await supabase
        .from('notifications')
        .insert({
          user_id: friendId,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${user.email} sent you a friend request`,
          related_user_id: user.id,
          friend_request_id: data.id
        });
    }

    // Force refresh of friends list and profile counts
    await fetchMutualFriends();
    
    // Manually trigger profile count refresh
    window.dispatchEvent(new CustomEvent('profile-counts-changed'));

    return data;
  };

  const acceptFriendRequest = async (requestId: string) => {
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    
    // Remove the notification for this friend request
    await supabase
      .from('notifications')
      .delete()
      .eq('friend_request_id', requestId)
      .eq('type', 'friend_request');
    
    // Force refresh of friends list and profile counts
    await fetchMutualFriends();
    
    // Manually trigger profile count refresh
    window.dispatchEvent(new CustomEvent('profile-counts-changed'));
    
    return data;
  };

  const rejectFriendRequest = async (requestId: string) => {
    // Delete the friend request entirely
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
    
    // Remove the notification for this friend request
    await supabase
      .from('notifications')
      .delete()
      .eq('friend_request_id', requestId)
      .eq('type', 'friend_request');
  };

  const cancelFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId)
      .eq('status', 'pending');

    if (error) throw error;
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    
    // Force refresh of friends list and profile counts
    await fetchMutualFriends();
    
    // Manually trigger profile count refresh
    window.dispatchEvent(new CustomEvent('profile-counts-changed'));
  };

  const unfollowUser = async (otherUserId: string) => {
    if (!user) throw new Error('User not authenticated');

    // Find the friendship record
    const { data: friendship, error: findError } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .single();

    if (findError) throw findError;
    
    if (friendship) {
      await removeFriend(friendship.id);
    }
  };

  const getFriendshipStatus = async (otherUserId: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  };

  useEffect(() => {
    fetchMutualFriends();
  }, [user]);

  return {
    friends,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    unfollowUser,
    getFriendshipStatus,
    refetch: fetchMutualFriends
  };
};