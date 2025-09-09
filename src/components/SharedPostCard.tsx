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
  const [isPostLiked, setIsPostLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleLike, checkIfUserLiked } = usePostInteractions();
  const { toast } = useToast();

  useEffect(() => {
    console.log('SharedPostCard: fetching post with ID:', postId);
    const fetchPost = async () => {
      try {
        // Fetch mapbox token first - this ensures it's available before rendering map
        try {
          console.log('SharedPostCard: Fetching mapbox token...');
          
          // Get current session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token', {
            headers: session ? {
              Authorization: `Bearer ${session.access_token}`,
            } : {}
          });
          
          if (tokenError) {
            console.error('SharedPostCard: Error from get-mapbox-token:', tokenError);
          } else if (tokenData?.token) {
            console.log('SharedPostCard: Got mapbox token:', tokenData.token.substring(0, 20) + '...');
            setMapboxToken(tokenData.token);
          } else {
            console.log('SharedPostCard: No token in response:', tokenData);
          }
        } catch (error) {
          console.log('SharedPostCard: Failed to get Mapbox token from edge function, checking localStorage');
          const token = localStorage.getItem('mapbox_token');
          if (token) {
            console.log('SharedPostCard: Using token from localStorage');
            setMapboxToken(token);
          } else {
            console.log('SharedPostCard: No token available');
          }
        }

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
            .select('id, title, destination, duration, distance, stops, images')
            .eq('id', postData.trip_id)
            .maybeSingle();
          tripData = data;
          console.log('SharedPostCard: Got trip data:', tripData);
          if (tripData?.stops) {
            console.log('SharedPostCard: Trip has stops:', tripData.stops.length);
          }
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
          
          // Check if post is saved
          const { data: savedItem } = await supabase
            .from('saved_items')
            .select('id')
            .eq('user_id', user.id)
            .eq('item_id', combinedData.id)
            .eq('item_type', 'post')
            .maybeSingle();
          setIsSaved(!!savedItem);
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

  const handleSave = (folderId?: string) => {
    setIsSaved(true);
    // Toast is handled by ItemFolderSelector
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

  const userInitials = (post?.profiles.name || 'U')[0].toUpperCase();
  
  // Parse image URLs - could be single URL or JSON array
  const getImageUrls = () => {
    if (!post?.image_url) return [];
    
    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(post.image_url);
      return Array.isArray(parsed) ? parsed : [post.image_url];
    } catch {
      // If not JSON, treat as single URL
      return [post.image_url];
    }
  };

  const images = getImageUrls();
  const hasImages = images.length > 0;
  const hasTrip = !!post?.trips && !!post?.trip_id;
  const tripImages = post?.trips?.images || [];
  const shouldShowCarousel = hasTrip || hasImages;

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
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 pb-2">
          <Avatar 
            className="w-7 h-7 cursor-pointer"
            onClick={handleProfileClick}
          >
            <AvatarImage src={post.profiles.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1" onClick={handleProfileClick}>
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="font-medium text-sm">{post.profiles.name}</span>
              <span className="text-muted-foreground text-xs">@{post.profiles.username}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.is_private && (
                <Badge variant="secondary" className="text-xs">Private</Badge>
              )}
            </div>
            {post.trips && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{post.trips.destination}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-3 pb-2">
            <p className="text-sm text-foreground cursor-pointer" onClick={handlePostClick}>
              {post.content}
            </p>
          </div>
        )}

        {/* Image/Map Carousel */}
        {shouldShowCarousel && (
          <div className="w-full h-44">
            <Carousel className="w-full h-full">
              <CarouselContent className="h-full">
                {/* Trip Map - Always first when trip exists */}
                {hasTrip && post.trips?.stops && post.trips.stops.length > 0 && (
                  <CarouselItem className="h-full">
                    <div className="h-full">
                      <CountryMap 
                        stops={post.trips.stops} 
                        className="h-full w-full" 
                        mapboxToken={mapboxToken}
                      />
                    </div>
                  </CarouselItem>
                )}
                
                {/* Trip Images */}
                {hasTrip && tripImages.map((image, index) => (
                  <CarouselItem key={`trip-${index}`} className="h-full">
                    <div className="h-full">
                      <img 
                        src={image} 
                        alt={`Trip photo ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
                
                {/* Post Images */}
                {images.map((image, index) => (
                  <CarouselItem key={`post-${index}`} className="h-full">
                    <div className="h-full">
                      <img 
                        src={image} 
                        alt={`Post image ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {((hasTrip && (tripImages.length > 0 || hasImages)) || images.length > 1) && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          </div>
        )}

        {/* Trip Info */}
        {hasTrip && (
          <div className="px-3 py-2">
            <h3 className="font-medium text-sm mb-1">{post.trips?.title}</h3>
            <p className="text-xs text-muted-foreground">
              {[post.trips?.duration, post.trips?.distance, post.trips?.stops && `${post.trips.stops.length} stops`]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 h-7 px-2 ${isPostLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                onClick={handleLike}
              >
                <Heart size={16} className={isPostLiked ? 'fill-current' : ''} />
                <span className="text-xs">{post.likes_count}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 h-7 px-2 text-muted-foreground"
                onClick={handlePostClick}
              >
                <MessageCircle size={16} />
                <span className="text-xs">{post.comments_count}</span>
              </Button>
            </div>
            
            <ItemFolderSelector
              itemId={post.id}
              itemType="post"
              onSave={handleSave}
            >
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 w-7 p-0 ${isSaved ? 'text-blue-500' : 'hover:text-blue-500'}`}
              >
                <Plus size={14} className={isSaved ? 'fill-current' : ''} />
              </Button>
            </ItemFolderSelector>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharedPostCard;