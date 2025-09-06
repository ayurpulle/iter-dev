import { useState, useEffect } from 'react';
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import CountryMap from "@/components/CountryMap";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  trip_id?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
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
  duration?: string;
  distance?: string;
  stops?: any;
}

interface PostWithProfile extends Post {
  profiles?: Profile | null;
  trips?: Trip | null;
}

const PostCard = ({ post, onDelete }: { post: PostWithProfile; onDelete: (postId: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");

  const isOwnPost = user?.id === post.user_id;

  // Try to get mapbox token from localStorage for enhanced map view
  useEffect(() => {
    const token = localStorage.getItem('mapbox_token');
    if (token) setMapboxToken(token);
  }, []);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    });
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully",
      });
      
      onDelete(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
  };

  const userName = post.profiles?.name || 'User';
  const username = post.profiles?.username || 'user';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  // Parse image URLs - could be single URL or JSON array
  const getImageUrls = () => {
    if (!post.image_url) return [];
    
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
  const hasTrip = post.trips && post.trips.stops && post.trips.stops.length > 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 pb-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.profiles?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground">
                @{username} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share size={14} className="mr-2" />
                  Share
                </DropdownMenuItem>
                {isOwnPost && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          {post.content && (
            <div className="px-4 pb-3">
              <p className="text-sm">{post.content}</p>
            </div>
          )}

          {/* Image/Map Carousel */}
          {(hasTrip || hasImages) && (
            <div className="w-full">
              <div className="h-64 bg-muted overflow-hidden">
                <Carousel className="w-full h-full">
                  <CarouselContent className="h-full">
                    {/* Trip Map - Always First if available */}
                    {hasTrip && (
                      <CarouselItem className="h-full">
                        <div className="h-full">
                          <CountryMap 
                            stops={post.trips!.stops || []} 
                            className="h-full w-full" 
                            mapboxToken={mapboxToken}
                          />
                        </div>
                      </CarouselItem>
                    )}
                    
                    {/* Images */}
                    {images.map((imageUrl, index) => (
                      <CarouselItem key={index} className="h-full">
                        <div className="h-full">
                          <img 
                            src={imageUrl} 
                            alt={`Post image ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {(hasTrip || images.length > 1) && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              </div>
            </div>
          )}

          {/* Trip Info */}
          {hasTrip && (
            <div className="px-4 py-2 bg-muted/30">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {post.trips?.title && <span className="font-medium">{post.trips.title}</span>}
                {post.trips?.duration && <span>{post.trips.duration}</span>}
                {post.trips?.distance && <span>{post.trips.distance}</span>}
                {post.trips?.stops && <span>{post.trips.stops.length} stops</span>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`flex items-center gap-2 h-8 px-2 ${isLiked ? 'text-red-500' : ''}`}
                onClick={handleLike}
              >
                <Heart size={18} className={isLiked ? 'fill-current' : ''} />
                <span className="text-sm">{likesCount}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
                <MessageCircle size={18} />
                <span className="text-sm">{post.comments_count}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_profiles_fkey (
            id,
            user_id,
            name,
            username,
            avatar
          ),
          trips (
            id,
            title,
            duration,
            distance,
            stops
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share your journey!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
            ))
          )}
        </div>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Index;
