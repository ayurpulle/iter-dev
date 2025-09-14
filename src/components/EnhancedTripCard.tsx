import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from "@/components/ui/carousel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Plus, MoreHorizontal, Share, Send, Users, DollarSign, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ItemFolderSelector } from "./ItemFolderSelector";
import CountryMap from "./CountryMap";
import { ItineraryShareDialog } from "./ItineraryShareDialog";
import { useProcessedImages } from "@/utils/imageProcessor";

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface PhotoDetail {
  url: string;
  caption: string;
  budget: string;
  tagged_friends: string[];
}

interface EnhancedTripCardProps {
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  trip: {
    id: string;
    title: string;
    duration: string;
    distance: string;
    stops: Stop[];
    photoCount: number;
    photos?: string[];
    photo_details?: PhotoDetail[];
    coverImage?: string;
    date?: string;
    companions?: number;
    description?: string;
    highlights?: string[];
    hashtags?: string[];
    cost?: string;
    rating?: number;
  };
  stats: {
    likes: number;
    comments: number;
  };
  expandable?: boolean;
}

const EnhancedTripCard: React.FC<EnhancedTripCardProps> = ({ user, trip, stats, expandable = false }) => {
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showUnsaveConfirm, setShowUnsaveConfirm] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likesCount, setLikesCount] = useState(stats.likes);
  const [commentsCount, setCommentsCount] = useState(stats.comments);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  // Process photo details or fallback to regular photos
  const photoDetails = trip.photo_details || trip.photos?.map(url => ({
    url,
    caption: '',
    budget: '',
    tagged_friends: []
  })) || [];
  
  const { processedImages, isProcessing } = useProcessedImages(photoDetails.map(p => p.url));
  
  // Current photo/media details for display
  const currentPhotoDetail = currentMediaIndex === 0 ? null : photoDetails[currentMediaIndex - 1];
  const isMapView = currentMediaIndex === 0;
  
  const getBudgetLabel = (budget: string): string => {
    const labels = {
      '$': 'Budget-friendly',
      '$$': 'Moderate', 
      '$$$': 'Expensive',
      '$$$$': 'Luxury',
      '$$$$$': 'Ultra-luxury'
    };
    return labels[budget as keyof typeof labels] || '';
  };
  
  // Define consistent height for all media content
  const getConsistentMediaHeight = () => {
    const STANDARD_HEIGHT = 256; // 16rem = 256px (h-64 equivalent)
    return `${STANDARD_HEIGHT}px`;
  };
  
  // Try to get mapbox token from localStorage for enhanced map view
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data } = await supabase.functions.invoke('get-mapbox-token', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
        });
        
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.log('Failed to get Mapbox token');
      }
    };
    
    getMapboxToken();
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentMediaIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    toast({
      title: isLiked ? "Trip unliked" : "Trip liked",
      description: isLiked ? "Like removed" : "Trip liked",
      duration: 3000,
    });
  };

  const handleSave = async (folderId?: string) => {
    if (!currentUser) return;
    
    if (isSaved) {
      setShowUnsaveConfirm(true);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('saved_items')
        .insert({
          user_id: currentUser.id,
          item_id: trip.id,
          item_type: 'trip',
          folder_id: folderId || null
        });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Success",
        description: folderId ? "Trip saved to folder" : "Trip saved to your collection",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({
        title: "Error",
        description: "Failed to save trip",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleUnsave = async () => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('item_id', trip.id)
        .eq('item_type', 'trip');

      if (error) throw error;

      setIsSaved(false);
      setShowUnsaveConfirm(false);
      toast({
        title: "Removed",
        description: "Trip removed from your collection",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error unsaving trip:', error);
      toast({
        title: "Error",
        description: "Failed to remove trip",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleShare = () => {
    toast({
      title: "Share trip",
      description: "Trip link copied to clipboard",
      duration: 3000,
    });
  };

  const handleComment = () => {
    if (showComments) {
      setShowComments(false);
      setComments([]);
      return;
    }
    
    setShowComments(true);
    
    // Show demo comments for trip cards
    setComments([
      {
        id: "demo-1",
        content: "Amazing trip! Love the route you took.",
        user: "Travel Buddy",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: "demo-2", 
        content: "Looks incredible! Adding this to my travel list.",
        user: "Explorer",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      }
    ]);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now().toString(),
      content: newComment.trim(),
      user: user.name,
      timestamp: new Date().toISOString()
    };
    
    setComments(prev => [...prev, comment]);
    setCommentsCount(prev => prev + 1);
    setNewComment("");
    
    toast({
      title: "Comment added",
      description: "Your comment has been posted",
      duration: 3000,
    });
  };

  // Total media items = 1 (map) + number of photos
  const totalMediaItems = 1 + photoDetails.length;
  
  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 pb-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(), { addSuffix: true })}
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
                  Share Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Image/Map Carousel */}
          <div className="w-full">
            <div 
              className="w-full bg-muted overflow-hidden"
              style={{ height: getConsistentMediaHeight() }}
            >
              <Carousel className="w-full h-full" setApi={setCarouselApi}>
                <CarouselContent className="h-full ml-0">
                  {/* Country Map with Route - Always First */}
                  <CarouselItem className="h-full pl-0">
                    <div className="w-full h-full flex items-center justify-center">
                      <CountryMap 
                        stops={trip.stops} 
                        className="w-full h-full" 
                        mapboxToken={mapboxToken}
                      />
                    </div>
                  </CarouselItem>
                  
                  {/* Photos with processed images */}
                  {processedImages.map((photo, index) => (
                    <CarouselItem key={`photo-${index}`} className="h-full pl-0">
                      <div className="w-full h-full bg-muted overflow-hidden">
                        <img 
                          src={photo} 
                          alt={`Trip photo ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {totalMediaItems > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`flex items-center gap-2 h-8 px-2 ${showComments ? 'text-primary' : ''}`}
                  onClick={handleComment}
                >
                  <MessageCircle size={18} />
                  <span className="text-sm">{commentsCount}</span>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {!isSaved ? (
                  <ItemFolderSelector itemId={trip.id} itemType="trip" onSave={handleSave}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:text-blue-500"
                    >
                      <Plus size={16} />
                    </Button>
                  </ItemFolderSelector>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-blue-500"
                    onClick={() => handleSave()}
                  >
                    <Plus size={16} className="fill-current" />
                  </Button>
                )}
                <ItineraryShareDialog 
                  itineraryId={trip.id}
                  itineraryTitle={trip.title}
                />
              </div>
            </div>

            {/* Dynamic Content based on current media */}
            <div className="mb-3">
              {isMapView ? (
                // Show trip overview when map is displayed
                <>
                  <h3 className="font-semibold text-base mb-1">
                    {trip.stops && trip.stops.length > 1 
                      ? `Trip to ${trip.stops[0]?.name || 'destination'} and ${trip.stops.length - 1} more`
                      : `Trip to ${trip.stops?.[0]?.name || trip.title}`
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {trip.duration} • {trip.distance} • {trip.stops.length} stops
                  </p>
                  {trip.cost && (
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign size={14} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{trip.cost}</span>
                    </div>
                  )}
                  {trip.description && (
                    <p className="text-sm mt-2">{trip.description}</p>
                  )}
                </>
              ) : (
                // Show photo-specific details
                currentPhotoDetail && (
                  <>
                    {currentPhotoDetail.caption && (
                      <p className="text-sm mb-2">{currentPhotoDetail.caption}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {currentPhotoDetail.budget && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={12} />
                          <span className="font-medium text-primary">{currentPhotoDetail.budget}</span>
                          <span className="text-xs">({getBudgetLabel(currentPhotoDetail.budget)})</span>
                        </div>
                      )}
                      
                      {currentPhotoDetail.tagged_friends.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>with {currentPhotoDetail.tagged_friends.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    {currentPhotoDetail.tagged_friends.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentPhotoDetail.tagged_friends.map((username) => (
                          <Badge key={username} variant="secondary" className="text-xs">
                            @{username}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )
              )}
            </div>

            {/* Inline Comments */}
            {showComments && (
              <div className="border-t pt-3 space-y-3">
                <div className="max-h-40 overflow-y-auto space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {comment.user[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{comment.user}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground">No comments yet. Be the first to comment!</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()} className="h-8">
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unsave Confirmation Dialog */}
      {showUnsaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Remove from collection?</h3>
            <p className="text-muted-foreground mb-4">This trip will be removed from your saved collection.</p>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowUnsaveConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleUnsave}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedTripCard;