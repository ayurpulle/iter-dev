import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin, Share, MoreHorizontal } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { Badge } from "@/components/ui/badge";
import { PostActions } from './PostActions';

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
    title: string;
    destination: string;
  };
}

interface SharedPostCardProps {
  postId: string;
  className?: string;
}

const SharedPostCard = ({ postId, className }: SharedPostCardProps) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPostLiked, setIsPostLiked] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleLike, checkIfUserLiked } = usePostInteractions();

  useEffect(() => {
    console.log('SharedPostCard: fetching post with ID:', postId);
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
            .select('title, destination')
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
        // Check if user has liked this post
        if (user) {
          const liked = await checkIfUserLiked(combinedData.id);
          setIsPostLiked(liked);
        }
      } catch (error) {
        console.error('Error fetching shared post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, user, checkIfUserLiked]);

  const handleLike = async () => {
    if (!post || !user) return;
    const success = await toggleLike(post.id);
    if (success) {
      setIsPostLiked(!isPostLiked);
      // Refetch the post to get updated like count
      const { data } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', post.id)
        .single();
      
      if (data) {
        setPost(prev => prev ? { ...prev, likes_count: data.likes_count } : null);
      }
    }
  };

  const handlePostClick = () => {
    navigate(`/post/${post?.id}`);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post) {
      navigate('/profile', { state: { userData: post.profiles } });
    }
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-4">
          <div className="h-32 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!post) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Post not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mb-4 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleProfileClick}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.profiles.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(post.profiles.name || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{post.profiles.name}</span>
                <span className="text-muted-foreground text-sm">@{post.profiles.username}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
                {post.is_private && (
                  <Badge variant="secondary" className="text-xs">Private</Badge>
                )}
              </div>
              {post.trips && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{post.trips.destination}</span>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal size={16} />
          </Button>
        </div>

        {post.content && (
          <p className="text-foreground mb-3 cursor-pointer" onClick={handlePostClick}>
            {post.content}
          </p>
        )}

        {post.image_url && (
          <div className="mb-3 cursor-pointer" onClick={handlePostClick}>
            <img 
              src={post.image_url} 
              alt="Post image" 
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-2 p-2 ${isPostLiked ? 'text-red-500' : 'text-muted-foreground'}`}
              onClick={handleLike}
            >
              <Heart size={18} className={isPostLiked ? 'fill-current' : ''} />
              <span className="text-sm">{post.likes_count}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 p-2 text-muted-foreground"
              onClick={handlePostClick}
            >
              <MessageCircle size={18} />
              <span className="text-sm">{post.comments_count}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharedPostCard;