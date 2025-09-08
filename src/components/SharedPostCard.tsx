import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin, Share } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  trip_id?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles!posts_user_id_fkey (
              name,
              username,
              avatar
            ),
            trips (
              title,
              destination
            )
          `)
          .eq('id', postId)
          .maybeSingle();

        if (error) throw error;
        if (data && data.profiles && !Array.isArray(data.profiles)) {
          setPost(data as unknown as Post);
        }
      } catch (error) {
        console.error('Error fetching shared post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-4">
          <div className="h-16 bg-muted rounded"></div>
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

  const handlePostClick = () => {
    navigate(`/post/${post.id}`);
  };

  return (
    <Card className={`cursor-pointer hover:bg-muted/50 transition-colors ${className}`} onClick={handlePostClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.profiles.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {(post.profiles.name || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{post.profiles.name}</span>
              <span className="text-xs text-muted-foreground">
                @{post.profiles.username}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            {post.trips && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{post.trips.destination}</span>
              </div>
            )}
          </div>
        </div>

        {post.content && (
          <p className="text-sm mb-3">{post.content}</p>
        )}

        {post.image_url && (
          <div className="mb-3">
            <img 
              src={post.image_url} 
              alt="Post image" 
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart size={16} />
            <span className="text-xs">{post.likes_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            <span className="text-xs">{post.comments_count}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharedPostCard;