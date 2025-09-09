import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin, Plus } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import CountryMap from "./CountryMap";
import { useToast } from "@/hooks/use-toast";
import { ItemFolderSelector } from "./ItemFolderSelector";

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  trip_id?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_private: boolean;
  profiles: {
    name: string;
    username: string;
    avatar: string;
  };
  trips?: {
    id: string;
    title: string;
    destination: string;
    duration?: string;
    distance?: string;
    stops?: Stop[];
    images?: string[];
  };
}

interface SharedPostCardProps {
  postId: string;
  className?: string;
}

const SharedPostCard = ({ postId, className }: SharedPostCardProps) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data: postData, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (error) throw error;
        if (!postData) return;

        // Get profile data separately
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, username, avatar')
          .eq('user_id', postData.user_id)
          .maybeSingle();

        // Get trip data if trip_id exists
        let tripData = null;
        if (postData.trip_id) {
          const { data } = await supabase
            .from('trips')
            .select('id, title, destination')
            .eq('id', postData.trip_id)
            .maybeSingle();
          tripData = data;
        }

        const combinedData = {
          ...postData,
          profiles: profileData || { name: 'Unknown User', username: 'unknown', avatar: '' },
          trips: tripData
        };
        
        setPost(combinedData as Post);
      } catch (error) {
        console.error('Error fetching shared post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handlePostClick = () => {
    navigate(`/post/${post?.id}`);
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-muted rounded-lg p-3">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-muted rounded-lg p-3">
        <p className="text-muted-foreground text-sm">Post not found</p>
      </div>
    );
  }

  const getPostDescription = () => {
    if (post.trips) {
      return `Check out ${post.profiles.name}'s trip to ${post.trips.destination}`;
    } else {
      return `Check out ${post.profiles.name}'s post`;
    }
  };

  return (
    <div 
      className={`bg-accent/30 hover:bg-accent/50 rounded-lg p-3 cursor-pointer transition-colors border border-border/50 ${className}`}
      onClick={handlePostClick}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-foreground">📸</span>
        <span className="text-foreground">{getPostDescription()}</span>
      </div>
      {post.content && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          "{post.content}"
        </p>
      )}
    </div>
  );
};

export default SharedPostCard;