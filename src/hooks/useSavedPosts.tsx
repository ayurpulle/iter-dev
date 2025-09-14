import { useState, useEffect, useCallback } from 'react';
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

  const fetchSavedPosts = useCallback(async () => {
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
        try {
          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select(`
              *,
              profiles!posts_user_id_profiles_fkey (
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
            .maybeSingle(); // Use maybeSingle() instead of single() to handle missing posts

          // Only add to results if the post still exists
          if (!postError && postData) {
            savedPostsWithDetails.push({
              ...savedItem,
              posts: postData
            } as SavedPost);
          } else if (postError) {
            console.warn(`Post ${savedItem.item_id} not found or error:`, postError);
            // Optionally, you could clean up the saved_items entry here
          }
        } catch (err) {
          console.warn(`Error fetching post ${savedItem.item_id}:`, err);
          // Continue with other posts instead of failing completely
        }
      }

      setSavedPosts(savedPostsWithDetails);
    } catch (err) {
      console.error('Error fetching saved posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch saved posts');
    } finally {
      setLoading(false);
    }
  }, [user]); // Add user as dependency since fetchSavedPosts depends on user

  // Memoize the filter functions to prevent unnecessary re-renders

  // Filter posts by type
  const getYourSavedPosts = useCallback(() => {
    return savedPosts;  // Return all saved posts, not just user's own posts
  }, [savedPosts]);

  const getFriendsSavedPosts = useCallback(() => {
    const friendIds = friends.map(f => f.friend_id);
    return savedPosts.filter(post => 
      post.posts?.user_id && friendIds.includes(post.posts.user_id)
    );
  }, [savedPosts, friends]);

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
  }, [user, fetchSavedPosts]); // Include fetchSavedPosts in dependencies

  return {
    savedPosts,
    yourSavedPosts: getYourSavedPosts(),
    friendsSavedPosts: getFriendsSavedPosts(),
    loading,
    error,
    refetch: fetchSavedPosts,
  };
};