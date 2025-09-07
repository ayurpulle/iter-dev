import { useState, useEffect } from 'react';
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Trash2, MoreHorizontal, ChevronDown, ChevronUp, Bookmark, Clock, MapPin, Users, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TripMapVisual from "@/components/TripMapVisual";
import { ItemFolderSelector } from "@/components/ItemFolderSelector";
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
  cost?: string;
  companions?: string;
  stops?: any;
  images?: string[];
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
  const [isLiking, setIsLiking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isOwnPost = user?.id === post.user_id;

  // Check if user has liked this post and get mapbox token
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setIsLiked(true);
        }
      } catch (error) {
        console.log('No existing like found');
      }
    };

    const getMapboxToken = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.log('Failed to get Mapbox token');
      }
    };
    
    getMapboxToken();
    checkLikeStatus();
  }, [post.id, user?.id]);

  const handleLike = async () => {
    if (!user?.id || isLiking) return;
    
    setIsLiking(true);
    
    try {
      if (isLiked) {
        // Unlike the post
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Update post likes count
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: Math.max(0, likesCount - 1) })
          .eq('id', post.id);
        
        if (updateError) throw updateError;
        
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like the post
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });
        
        if (error) throw error;
        
        // Update post likes count
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: likesCount + 1 })
          .eq('id', post.id);
        
        if (updateError) throw updateError;
        
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleSavePost = async (folderId?: string) => {
    try {
      setIsSaved(true);
      // The actual saving is handled by ItemFolderSelector component
    } catch (error) {
      setIsSaved(false);
      console.error('Error saving post:', error);
    }
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
  const hasTrip = !!post.trips && !!post.trip_id; // Simply check if trip exists
  const shouldShowCarousel = hasTrip || hasImages;

  return (
    <>
      <Card className="overflow-hidden flex flex-col h-screen">
        <CardContent className="p-0 flex flex-col h-full">
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

          {/* Trip title at top if available */}
          {hasTrip && post.trips?.title && (
            <div className="px-4 pb-3">
              <h3 className="font-semibold text-base">{post.trips.title}</h3>
            </div>
          )}

          {/* Image/Map Carousel - Takes remaining space */}
          {shouldShowCarousel && (
            <div className="flex-1 w-full">
              <Carousel className="w-full h-full">
                <CarouselContent className="h-full ml-0">
                  {/* Trip Map - ALWAYS FIRST when trip exists */}
                  {hasTrip && (
                    <CarouselItem className="h-full pl-0">
                      <div className="h-full w-full relative bg-white">
                        <TripMapVisual 
                          stops={post.trips?.stops || []} 
                          className="w-full h-full"
                        />
                        {/* Trip overlay indicator */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-30">
                          📍 Trip Route
                        </div>
                      </div>
                    </CarouselItem>
                  )}
                  
                  {/* Images - Come after trip map */}
                  {images.map((imageUrl, index) => (
                    <CarouselItem key={`image-${index}`} className="h-full pl-0">
                      <div className="h-full">
                         <img 
                           src={imageUrl} 
                           alt={`Post image ${index + 1}`} 
                           className="w-full h-full object-cover object-center"
                         />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {/* Show navigation if there's a trip map + images, or multiple images */}
                {((hasTrip && hasImages) || images.length > 1) && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
          )}

          {/* Trip Details at bottom - Fixed height */}
          <div className="px-4 py-3 space-y-3">
            {/* Caption/Description */}
            {post.content && (
              <p className="text-sm leading-relaxed">{post.content}</p>
            )}
            
            {/* Collapsible Trip Details */}
            {hasTrip && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-xs">Tap to see trip details</span>
                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {post.trips?.duration && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                        <Clock size={12} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Duration</p>
                          <p className="text-muted-foreground">{post.trips.duration}</p>
                        </div>
                      </div>
                    )}
                    {post.trips?.distance && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                        <MapPin size={12} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Distance</p>
                          <p className="text-muted-foreground">{post.trips.distance}</p>
                        </div>
                      </div>
                    )}
                    {post.trips?.cost && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                        <DollarSign size={12} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Budget</p>
                          <p className="text-muted-foreground">{post.trips.cost}</p>
                        </div>
                      </div>
                    )}
                    {post.trips?.companions && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                        <Users size={12} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">With</p>
                          <p className="text-muted-foreground">{post.trips.companions}</p>
                        </div>
                      </div>
                    )}
                    {post.trips?.stops && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 col-span-2">
                        <MapPin size={12} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Route</p>
                          <p className="text-muted-foreground">{post.trips.stops.length} stops total</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`flex items-center gap-2 h-8 px-2 ${isLiked ? 'text-red-500' : ''}`}
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  <Heart size={18} className={isLiked ? 'fill-current' : ''} />
                  <span className="text-sm">{likesCount}</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
                  <MessageCircle size={18} />
                  <span className="text-sm">{post.comments_count}</span>
                </Button>
              </div>
              
              {/* Save Button */}
              <ItemFolderSelector itemId={post.id} itemType="post" onSave={handleSavePost}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 w-8 p-0 ${isSaved ? 'text-blue-500' : ''}`}
                >
                  <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
                </Button>
              </ItemFolderSelector>
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
          profiles!inner (
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
            cost,
            companions,
            stops,
            images
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
