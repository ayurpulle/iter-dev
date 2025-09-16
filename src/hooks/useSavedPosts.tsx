import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFriends } from './useFriends';

export interface SavedPost {
  id: string;
  item_id: string;
  item_type: string;
  created_at: string;
  folder_id?: string;
  posts?: {
    id: string;
    content?: string;
    image_url?: string;
    created_at: string;
    user_id: string;
    trip_id?: string;
    profiles?: {
      name?: string;
      username?: string;
      avatar?: string;
    };
    trips?: {
      title?: string;
      stops?: any;
    };
  };
}

export const useSavedPosts = () => {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedPosts = async () => {
    if (!user) return;

    try {
      // First get saved items
      const { data: savedItemsData, error: savedItemsError } = await supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_type', 'post')
        .order('created_at', { ascending: false });

      if (savedItemsError) throw savedItemsError;

      // Then get the corresponding posts with their details
      const savedPostsWithDetails: SavedPost[] = [];
      
      for (const savedItem of savedItemsData || []) {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`
            *,
            profiles (
              name,
              username,
              avatar
            ),
            trips (
              title,
              stops
            )
          `)
          .eq('id', savedItem.item_id)
          .single();

        if (!postError && postData) {
          savedPostsWithDetails.push({
            ...savedItem,
            posts: postData
          } as SavedPost);
        }
      }

      setSavedPosts(savedPostsWithDetails);
    } catch (err) {
      console.error('Error fetching saved posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch saved posts');
    } finally {
      setLoading(false);
    }
  };

  // Filter posts by type
  const getYourSavedPosts = () => {
    return savedPosts;  // Return all saved posts, not just user's own posts
  };

  const getFriendsSavedPosts = () => {
    const friendIds = friends.map(f => f.friend_id);
    return savedPosts.filter(post => 
      post.posts?.user_id && friendIds.includes(post.posts.user_id)
    );
  };

  useEffect(() => {
    fetchSavedPosts();

    // Set up real-time subscription for saved_items changes
    const channel = supabase
      .channel('saved-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_items',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Saved items changed:', payload);
          // Refetch saved posts when saved_items changes
          fetchSavedPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    savedPosts,
    yourSavedPosts: getYourSavedPosts(),
    friendsSavedPosts: getFriendsSavedPosts(),
    loading,
    error,
    refetch: fetchSavedPosts,
  };
};