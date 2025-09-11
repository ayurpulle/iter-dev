import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Trash2, MoreHorizontal, ChevronDown, ChevronUp, Plus, Clock, MapPin, Users, DollarSign, Send, Reply } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TripMapVisual from "@/components/TripMapVisual";
import { CommentReplies } from "@/components/CommentReplies";
import { ShareToChatDialog } from "@/components/ShareToChatDialog";
import { ItemFolderSelector } from "@/components/ItemFolderSelector";
import { PostActions } from "@/components/PostActions";
import { useProcessedImages } from "@/utils/imageProcessor";
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
  destination?: string;
  duration?: string;
  distance?: string;
  cost?: string;
  companions?: string;
  stops?: any; // JSON field from database
  images?: string[];
}

interface PostWithProfile extends Post {
  profiles?: Profile | null;
  trips?: Trip | null;
}

interface UnifiedPostCardProps {
  post: PostWithProfile | {
    id: string;
    user_id: string;
    content: string;
    image_url?: string;
    trip_id?: string;
    is_private: boolean;
    likes_count: number;
    comments_count: number;
    created_at: string;
    trips?: {
      id: string;
      title: string;
      destination: string;
      stops?: any[];
    };
  };
  profile?: Profile;
  onDelete?: (postId: string) => void;
  onPostUpdate?: (updatedPost: any) => void;
  onPostDelete?: () => void;
}

const UnifiedPostCard = ({ post, profile, onDelete, onPostUpdate, onPostDelete }: UnifiedPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { yourSavedPosts, refetch } = useSavedPosts();
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
    replies?: Array<{
      id: string;
      content: string;
      user: { name: string; avatar: string | null };
      created_at: string;
      user_id?: string;
    }>;
  }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const isOwnPost = user?.id === post.user_id;

  // Check if user has liked this post and if post is saved
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

    // Check if post is saved
    const checkSavedStatus = () => {
      if (!user?.id) return;
      const isPostSaved = yourSavedPosts.some(savedPost => savedPost.item_id === post.id);
      setIsSaved(isPostSaved);
    };

    const getMapboxToken = async () => {
      try {
        // Get current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data } = await supabase.functions.invoke('get-mapbox-token', {
          headers: session ? {
            Authorization: `Bearer ${session.access_token}`,
          } : {}
        });
        
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
        // Load parent comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            parent_id
          `)
          .eq('post_id', post.id)
          .is('parent_id', null) // Only parent comments
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;

        // Load replies for all comments
        const { data: repliesData, error: repliesError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            parent_id
          `)
          .eq('post_id', post.id)
          .not('parent_id', 'is', null) // Only replies
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        // Get user profiles for all comments and replies
        const allUserIds = [...new Set([
          ...(commentsData || []).map(comment => comment.user_id),
          ...(repliesData || []).map(reply => reply.user_id)
        ])];
        
        let profiles = [];
        if (allUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, avatar')
            .in('user_id', allUserIds);
          
          if (!profilesError) {
            profiles = profilesData || [];
          }
        }

        // Format comments with replies
        const formattedComments = (commentsData || []).map(comment => {
          const userProfile = profiles.find(p => p.user_id === comment.user_id);
          const commentReplies = (repliesData || [])
            .filter(reply => reply.parent_id === comment.id)
            .map(reply => {
              const replyProfile = profiles.find(p => p.user_id === reply.user_id);
              return {
                id: reply.id,
                content: reply.content,
                user: {
                  name: replyProfile?.name || 'Unknown User',
                  avatar: replyProfile?.avatar || null
                },
                created_at: formatDistanceToNow(new Date(reply.created_at), { addSuffix: true }),
                user_id: reply.user_id
              };
            });

          return {
            id: comment.id,
            content: comment.content,
            user: {
              name: userProfile?.name || 'Unknown User',
              avatar: userProfile?.avatar || null
            },
            created_at: formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }),
            user_id: comment.user_id,
            replies: commentReplies
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
    checkSavedStatus();
    loadComments();
  }, [post.id, user?.id]);

  // Watch for changes in saved posts state
  useEffect(() => {
    const checkSavedStatus = () => {
      if (!user?.id) return;
      const isPostSaved = yourSavedPosts.some(savedPost => savedPost.item_id === post.id);
      setIsSaved(isPostSaved);
    };
    
    checkSavedStatus();
  }, [yourSavedPosts, post.id, user?.id]);

  const handleLike = async () => {
    if (!user?.id || isLiking) return;
    
    setIsLiking(true);
    
    try {
      // First check if the post still exists
      const { data: postCheck } = await supabase
        .from('posts')
        .select('id')
        .eq('id', post.id)
        .single();

      if (!postCheck) {
        toast({
          title: "Post not found",
          description: "This post may have been deleted",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

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

        // Create notification for post author (including self for testing)
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'like',
          title: 'New Like',
          message: `${userName} liked your post`,
          related_user_id: user.id,
          related_post_id: post.id,
          related_like_id: Math.random().toString() // temporary ID for grouping
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      toast({
        title: "Error",
        description: error.message?.includes('violates foreign key constraint') 
          ? "This post may have been deleted" 
          : "Failed to update like",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleSavePost = async (folderId?: string) => {
    if (!user?.id) return;

    try {
      // Check current saved status from database to avoid duplicate key errors
      const existingSavedItem = yourSavedPosts.find(sp => sp.item_id === post.id);
      
      if (existingSavedItem) {
        // Unsave the post
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('id', existingSavedItem.id);

        if (error) throw error;

        setIsSaved(false);
        refetch();
        toast({
          title: "Post unsaved",
          description: "Post removed from your collection",
          duration: 3000,
        });
      } else {
        // Save the post - first check if it already exists to avoid duplicates
        const { data: existingCheck } = await supabase
          .from('saved_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_id', post.id)
          .eq('item_type', 'post')
          .single();

        if (existingCheck) {
          // Already exists, just update UI
          setIsSaved(true);
          refetch();
          return;
        }

        // Insert new saved item
        const { error } = await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            item_id: post.id,
            item_type: 'post',
            folder_id: folderId || null
          });

        if (error) throw error;

        setIsSaved(true);
        refetch();
        toast({
          title: "Post saved",
          description: "Post added to your collection",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      toast({
        title: "Error",
        description: "Failed to save/unsave post",
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
            avatar: (post as PostWithProfile).profiles?.avatar || profile?.avatar || null
          },
          created_at: "now",
          user_id: data.user_id
        };
      
      setComments(prev => [newCommentFormatted, ...prev]);
      setNewComment("");

      // Create notification for post author (including self for testing)
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        type: 'comment',
        title: 'New Comment',
        message: `${userName} commented on your post`,
        related_user_id: user.id,
        related_post_id: post.id,
        related_comment_id: data.id
      });
      
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

  const handleRepliesUpdate = (commentId: string, updatedReplies: any[]) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, replies: updatedReplies }
        : comment
    ));
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

  const userName = (post as PostWithProfile).profiles?.name || profile?.name || 'User';
  const username = (post as PostWithProfile).profiles?.username || profile?.username || 'user';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const getLocationText = () => {
    const tripData = (post as any).trips;
    if (!tripData) return null;
    
    const { destination, stops } = tripData;
    if (!destination) return null;
    
    const additionalStops = stops?.length ? stops.length : 0;
    
    if (additionalStops > 0) {
      return `Trip to ${destination} and ${additionalStops} more`;
    }
    
    return `Trip to ${destination}`;
  };

  const locationText = getLocationText();

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
  const hasTrip = !!(post as any).trips && !!post.trip_id; // Simply check if trip exists
  const shouldShowCarousel = hasTrip || hasImages;
  const { processedImages, isProcessing } = useProcessedImages(images);

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
              <AvatarImage src={(post as PostWithProfile).profiles?.avatar || profile?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground">
                @{username} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
              {locationText && (
                <p className="text-xs text-blue-600 font-medium">{locationText}</p>
              )}
            </div>
            
          {/* Unified action dropdown */}
          <div className="flex items-center gap-1">
            <PostActions
              postId={post.id}
              postUserId={post.user_id}
              content={post.content || ''}
              isPrivate={post.is_private}
              onPostDeleted={() => {
                onDelete?.(post.id);
                onPostDelete?.();
              }}
              onPostUpdated={onPostUpdate}
            />
          </div>
          </div>

          {/* Trip title at top if available - MOVED TO AFTER MAP */}

          {/* Image/Map Carousel */}
          {shouldShowCarousel && (
            <div 
              className="w-full bg-muted overflow-hidden"
              style={{ height: "208px" }}
            >
              <Carousel className="w-full h-full">
                <CarouselContent className="h-full ml-0">
                   {/* Trip Map - ALWAYS FIRST when trip exists */}
                    {hasTrip && (
                      <CarouselItem className="h-full pl-0">
                        <div className="w-full h-full flex items-center justify-center">
                          <TripMapVisual 
                            stops={(post as any).trips?.stops ? (Array.isArray((post as any).trips.stops) ? (post as any).trips.stops : []) : []} 
                            className="w-full h-full"
                          />
                        </div>
                      </CarouselItem>
                    )}
                  
                  {/* Images - Come after trip map */}
                  {processedImages.map((imageUrl, index) => (
                    <CarouselItem key={`image-${index}`} className="h-full pl-0">
                      <div className="w-full h-full bg-muted overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt={`Post image ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {/* Show navigation if there's a trip map + images, or multiple images */}
                {((hasTrip && hasImages) || processedImages.length > 1) && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
          )}

          {/* Trip Location Header */}
          {hasTrip && post.trips && (
            <div className="px-4 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {(() => {
                    const stops = post.trips.stops ? (Array.isArray(post.trips.stops) ? post.trips.stops : []) : [];
                    return stops.length > 1 
                      ? `Trip to ${post.trips.destination || stops[0]?.name} and ${stops.length - 1} more`
                      : `Trip to ${post.trips.destination || stops[0]?.name || 'destination'}`;
                  })()}
                </span>
              </div>
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
                      <p className="text-sm leading-relaxed">{post.content}</p>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* Trip stats */}
            {hasTrip && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-6 px-1 text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-xs">
                      {showDetails ? "Hide trip details" : "Show trip details"}
                    </span>
                    {showDetails ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-1">
                    {(post as PostWithProfile).trips?.duration && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={14} />
                        <span>{(post as PostWithProfile).trips.duration}</span>
                      </div>
                    )}
                    {(post as PostWithProfile).trips?.distance && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin size={14} />
                        <span>{(post as PostWithProfile).trips.distance}</span>
                      </div>
                    )}
                    {(post as PostWithProfile).trips?.companions && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users size={14} />
                        <span>{(post as PostWithProfile).trips.companions}</span>
                      </div>
                    )}
                    {(post as PostWithProfile).trips?.cost && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign size={14} />
                        <span>{(post as PostWithProfile).trips.cost}</span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Actions - Likes, Comments, Save */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`p-2 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
              >
                <Heart 
                  className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} 
                />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="p-2 text-muted-foreground"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
              
              <ShareToChatDialog
                itemType="post"
                itemId={post.id}
                itemTitle={hasTrip ? (() => {
                  const stops = post.trips?.stops ? (Array.isArray(post.trips.stops) ? post.trips.stops : []) : [];
                  return stops.length > 1 
                    ? `Trip to ${post.trips?.destination || stops[0]?.name} and ${stops.length - 1} more`
                    : `Trip to ${post.trips?.destination || stops[0]?.name || 'destination'}`;
                })() : "Post"}
                content={post.content || ""}
                triggerText=""
                variant="ghost"
                size="sm"
              />
            </div>

            {/* Bottom right action buttons for trip posts */}
            {hasTrip && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <ShareToChatDialog
                  itemType="post"
                  itemId={post.id}
                  itemTitle={hasTrip ? (() => {
                    const stops = post.trips?.stops ? (Array.isArray(post.trips.stops) ? post.trips.stops : []) : [];
                    return stops.length > 1 
                      ? `Trip to ${post.trips?.destination || stops[0]?.name} and ${stops.length - 1} more`
                      : `Trip to ${post.trips?.destination || stops[0]?.name || 'destination'}`;
                  })() : "Post"}
                  content={post.content || ""}
                  triggerText=""
                  variant="ghost"
                  size="sm"
                />
                
                {isSaved ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-500 p-2 hover:text-blue-600 bg-white/80 backdrop-blur-sm"
                    onClick={() => handleSavePost()}
                  >
                    <Plus className="w-5 h-5 fill-current" />
                    <span className="ml-1 text-sm">Saved</span>
                  </Button>
                ) : (
                  <ItemFolderSelector
                    itemId={post.id}
                    itemType="post"
                    onSave={handleSavePost}
                  >
                    <Button variant="ghost" size="sm" className="text-muted-foreground p-2 hover:text-blue-500 bg-white/80 backdrop-blur-sm">
                      <Plus className="w-5 h-5" />
                      <span className="ml-1 text-sm">Save</span>
                    </Button>
                  </ItemFolderSelector>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="px-4 py-3 border-t bg-muted/20">
              {/* Add Comment */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddComment();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  size="sm"
                >
                  <Send size={16} />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {loadingComments ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={comment.user.avatar || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {comment.user.name[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{comment.user.name}</p>
                          <p className="text-xs text-muted-foreground">{comment.created_at}</p>
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
                         <p className="text-sm break-words">{comment.content}</p>
                         <CommentReplies
                           commentId={comment.id}
                           postId={post.id}
                           postUserId={post.user_id}
                           replies={comment.replies || []}
                           onRepliesUpdate={handleRepliesUpdate}
                         />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
};
export default UnifiedPostCard;