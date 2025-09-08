import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Trash2, MoreHorizontal, ChevronDown, ChevronUp, Plus, Clock, MapPin, Users, DollarSign, Send } from "lucide-react";
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

interface UnifiedPostCardProps {
  post: PostWithProfile;
  onDelete: (postId: string) => void;
}

const UnifiedPostCard = ({ post, onDelete }: UnifiedPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isLiking, setIsLiking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Array<{
    id: string;
    content: string;
    user: { name: string; avatar: string | null };
    created_at: string;
    user_id?: string;
  }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const isOwnPost = user?.id === post.user_id;

  // Check if user has liked this post and get mapbox token + load comments
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

    const loadComments = async () => {
      setLoadingComments(true);
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id
          `)
          .eq('post_id', post.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get user profiles for comments
        const userIds = [...new Set((data || []).map(comment => comment.user_id))];
        let profiles = [];
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, avatar')
            .in('user_id', userIds);
          
          if (!profilesError) {
            profiles = profilesData || [];
          }
        }

        const formattedComments = (data || []).map(comment => {
          const userProfile = profiles.find(p => p.user_id === comment.user_id);
          return {
            id: comment.id,
            content: comment.content,
            user: {
              name: userProfile?.name || 'Unknown User',
              avatar: userProfile?.avatar || null
            },
            created_at: formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }),
            user_id: comment.user_id
          };
        });

        setComments(formattedComments);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setLoadingComments(false);
      }
    };
    
    getMapboxToken();
    checkLikeStatus();
    loadComments();
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
          duration: 3000,
        });
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleSavePost = async (folderId?: string) => {
    try {
      setIsSaved(true);
      toast({
        title: "Post saved",
        description: "Post added to your collection",
        duration: 3000,
      });
    } catch (error) {
      setIsSaved(false);
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        })
        .select('id, content, created_at, user_id')
        .single();

      if (error) throw error;

      const newCommentFormatted = {
        id: data.id,
        content: data.content,
        user: {
          name: userName,
          avatar: post.profiles?.avatar || null
        },
        created_at: "now",
        user_id: data.user_id
      };
      
      setComments(prev => [newCommentFormatted, ...prev]);
      setNewComment("");
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
        duration: 3000,
      });
    }
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
        duration: 3000,
      });
      
      onDelete(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
        duration: 3000,
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

  // Caption logic
  const maxCaptionLength = 150;
  const isCaptionLong = post.content && post.content.length > maxCaptionLength;
  const captionToShow = isCaptionLong && !showFullCaption 
    ? post.content.slice(0, maxCaptionLength) + "..."
    : post.content;

  // Dynamic height calculation
  const getCardHeight = () => {
    if (!post.content) return "h-auto max-h-60";
    if (post.content.length <= 50) return "h-auto";
    if (post.content.length <= 100) return "h-auto max-h-48";
    return "h-auto max-h-60";
  };

  return (
    <>
      <Card className={`overflow-hidden ${getCardHeight()}`}>
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
            {isOwnPost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Trip title at top if available */}
          {hasTrip && post.trips?.title && (
            <div className="px-4 pb-3">
              <h3 className="font-semibold text-base">{post.trips.title}</h3>
            </div>
          )}

          {/* Image/Map Carousel */}
          {shouldShowCarousel && (
            <div className="w-full h-52">
              <Carousel className="w-full h-full">
                <CarouselContent className="h-full ml-0">
                  {/* Trip Map - ALWAYS FIRST when trip exists */}
                   {hasTrip && (
                     <CarouselItem className="h-full pl-0">
                       <TripMapVisual 
                         stops={post.trips?.stops || []} 
                         className="w-full h-full"
                       />
                     </CarouselItem>
                   )}
                  
                  {/* Images - Come after trip map */}
                  {images.map((imageUrl, index) => (
                    <CarouselItem key={`image-${index}`} className="h-full pl-0">
                      <img 
                        src={imageUrl} 
                        alt={`Post image ${index + 1}`} 
                        className="w-full h-full object-cover object-center"
                      />
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
          <div className="px-4 pb-3">
            {/* Caption/Description */}
            {post.content && (
              <div>
                <p className="text-sm leading-relaxed">{captionToShow}</p>
                {isCaptionLong && (
                  <Collapsible open={showFullCaption} onOpenChange={setShowFullCaption}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1 h-6 px-1 text-muted-foreground hover:text-foreground"
                      >
                        <span className="text-xs">
                          {showFullCaption ? "Show less" : "Show more"}
                        </span>
                        {showFullCaption ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <p className="text-sm leading-relaxed mt-1">{post.content}</p>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-2 h-8 px-2"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle size={18} />
                  <span className="text-sm">{comments.length}</span>
                </Button>
              </div>
              
              {/* Save Button */}
              <ItemFolderSelector itemId={post.id} itemType="post" onSave={handleSavePost}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 w-8 p-0 ${isSaved ? 'text-blue-500' : ''} hover:text-blue-500`}
                >
                  <Plus size={16} className={isSaved ? 'fill-current' : ''} />
                </Button>
              </ItemFolderSelector>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="px-4 pb-4 border-t pt-4 mt-4">
                {/* Add Comment */}
                <div className="flex gap-2 mb-4">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={post.profiles?.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-3"
                    >
                      <Send size={14} />
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {loadingComments ? (
                    <div className="text-center py-4">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={comment.user.avatar} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {comment.user.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">{comment.created_at}</span>
                            {comment.user_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UnifiedPostCard;