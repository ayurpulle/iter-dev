import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  trip_id?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_private?: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

interface Trip {
  id: string;
  title?: string;
  destination?: string;
  duration?: string;
  distance?: string;
  cost?: string;
  companions?: string;
  stops?: any;
  images?: string[];
  photo_details?: any;
  description?: string;
}

interface PostWithProfile extends Post {
  profiles?: Profile | null;
  trips?: Trip | null;
}

export const useOptimizedPosts = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // First, fetch essential post data quickly
  const fetchEssentialPosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          user_id,
          trip_id,
          created_at,
          likes_count,
          comments_count,
          is_private
        `)
        .order('created_at', { ascending: false })
        .limit(10); // Load first 10 posts quickly

      if (error) throw error;

      // Set posts immediately with minimal data
      setPosts(postsData?.map(post => ({ ...post, profiles: null, trips: null })) || []);
      setLoading(false);
      
      return postsData || [];
    } catch (error) {
      console.error('Error fetching essential posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
        duration: 3000,
      });
      setLoading(false);
      return [];
    }
  }, [toast]);

  // Then, enrich posts with profile and trip data
  const enrichPostsData = useCallback(async (essentialPosts: Post[]) => {
    if (essentialPosts.length === 0) return;

    try {
      // Get unique user IDs and trip IDs
      const userIds = [...new Set(essentialPosts.map(post => post.user_id))];
      const tripIds = [...new Set(essentialPosts.filter(post => post.trip_id).map(post => post.trip_id!))];

      // Fetch profiles and trips in parallel
      const [profilesResponse, tripsResponse] = await Promise.all([
        userIds.length > 0 ? supabase
          .from('profiles')
          .select('id, user_id, name, username, avatar')
          .in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
        tripIds.length > 0 ? supabase
          .from('trips')
          .select('id, title, destination, duration, distance, cost, companions, stops, images, photo_details, description')
          .in('id', tripIds) : Promise.resolve({ data: [], error: null })
      ]);

      if (profilesResponse.error || tripsResponse.error) {
        console.error('Error enriching posts:', profilesResponse.error || tripsResponse.error);
        return;
      }

      const profiles = profilesResponse.data || [];
      const trips = tripsResponse.data || [];

      // Enrich posts with profile and trip data
      setPosts(prevPosts => 
        prevPosts.map(post => ({
          ...post,
          profiles: profiles.find(profile => profile.user_id === post.user_id) || null,
          trips: post.trip_id ? trips.find(trip => trip.id === post.trip_id) || null : null
        }))
      );
    } catch (error) {
      console.error('Error enriching posts data:', error);
    }
  }, []);

  // Load more posts when needed
  const loadMorePosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            user_id,
            name,
            username,
            avatar
          ),
          trips (
            id,
            title,
            destination,
            duration,
            distance,
            cost,
            companions,
            stops,
            images,
            photo_details,
            description
          )
        `)
        .order('created_at', { ascending: false })
        .range(posts.length, posts.length + 9); // Load 10 more posts

      if (error) throw error;

      setPosts(prev => [...prev, ...(postsData || [])]);
    } catch (error) {
      console.error('Error loading more posts:', error);
      toast({
        title: "Error",
        description: "Failed to load more posts",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [posts.length, toast]);

  // Initialize posts loading
  useEffect(() => {
    const loadPosts = async () => {
      setInitialLoad(true);
      
      // Step 1: Load essential data quickly
      const essentialPosts = await fetchEssentialPosts();
      
      // Step 2: Enrich with detailed data in background
      if (essentialPosts.length > 0) {
        setTimeout(() => enrichPostsData(essentialPosts), 100);
      }
      
      setInitialLoad(false);
    };

    loadPosts();
  }, [fetchEssentialPosts, enrichPostsData]);

  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  }, []);

  return {
    posts,
    loading,
    initialLoad,
    loadMorePosts,
    handleDeletePost,
    refetch: fetchEssentialPosts
  };
};