import React, { memo, useState, lazy, Suspense } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import ClickableUserInfo from "@/components/ClickableUserInfo";

// Lazy load heavy components
const LazyTripMapVisual = lazy(() => import('@/components/LazyTripMapVisual'));
const LazyCarousel = lazy(() => import('@/components/ui/carousel').then(mod => ({ default: mod.Carousel })));
const LazyCarouselContent = lazy(() => import('@/components/ui/carousel').then(mod => ({ default: mod.CarouselContent })));
const LazyCarouselItem = lazy(() => import('@/components/ui/carousel').then(mod => ({ default: mod.CarouselItem })));

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
}

interface PostWithProfile extends Post {
  profiles?: Profile | null;
  trips?: Trip | null;
}

interface OptimizedPostCardProps {
  post: PostWithProfile;
  onDelete?: (postId: string) => void;
}

const MapSkeleton = () => (
  <Skeleton className="w-full h-48 rounded-lg mb-3" />
);

const CarouselSkeleton = () => (
  <Skeleton className="w-full h-24 rounded" />
);

const OptimizedPostCard = memo(({ post, onDelete }: OptimizedPostCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const userName = post.profiles?.name || post.profiles?.username || 'Unknown User';
  const userAvatar = post.profiles?.avatar;
  
  // Parse trip stops for map
  const tripStops = post.trips?.stops ? 
    (Array.isArray(post.trips.stops) ? post.trips.stops : []) : [];

  return (
    <Card className="mb-4 border-none shadow-sm bg-card">
      <CardContent className="p-4">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-3">
          <ClickableUserInfo
            username={post.profiles?.username}
            name={post.profiles?.name}
            avatar={userAvatar}
            userId={post.user_id}
            className="flex items-center gap-3 flex-1"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={userAvatar} />
              <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </ClickableUserInfo>
        </div>

        {/* Trip Info */}
        {post.trips && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-sm">{post.trips.title}</h3>
            {post.trips.destination && (
              <p className="text-xs text-muted-foreground">{post.trips.destination}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="mb-3">
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Trip Map - Lazy loaded */}
        {tripStops.length > 0 && (
          <Suspense fallback={<MapSkeleton />}>
            <LazyTripMapVisual 
              stops={tripStops} 
              className="w-full aspect-square rounded-lg mb-3" 
            />
          </Suspense>
        )}

        {/* Post Image with lazy loading */}
        {post.image_url && (
          <div className="mb-3 relative">
            {!imageLoaded && <Skeleton className="w-full aspect-square rounded-lg" />}
            <img
              src={post.image_url}
              alt="Post content"
              className={`w-full aspect-square object-cover rounded-lg transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        )}

        {/* Trip Images - Simple display instead of lazy carousel */}
        {post.trips?.images && post.trips.images.length > 0 && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2">
              {post.trips.images.slice(0, 4).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Trip image ${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* Basic Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Heart className="h-4 w-4 mr-1" />
              <span className="text-sm">{post.likes_count}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">{post.comments_count}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedPostCard.displayName = 'OptimizedPostCard';

export default OptimizedPostCard;