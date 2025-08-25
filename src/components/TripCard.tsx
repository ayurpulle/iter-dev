import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Heart, MessageCircle, Share, MoreHorizontal, Clock, Navigation, MapPin, Calendar, Users, Star, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import CountryMap from "./CountryMap";
import MiniMap from "./MiniMap";

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface TripCardProps {
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  trip: {
    title: string;
    duration: string;
    distance: string;
    stops: Stop[];
    photoCount: number;
    coverImage?: string;
    date?: string;
    companions?: number;
    description?: string;
    highlights?: string[];
    cost?: string;
    rating?: number;
    photos?: string[];
  };
  stats: {
    likes: number;
    comments: number;
  };
  expandable?: boolean;
}

const TripCard: React.FC<TripCardProps> = ({ user, trip, stats, expandable = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  
  // Try to get mapbox token from localStorage for enhanced map view
  useState(() => {
    const token = localStorage.getItem('mapbox_token');
    if (token) setMapboxToken(token);
  });
  
  const photos = trip.photos || [];
  const hasPhotos = photos.length > 0;
  
  return (
    <Card className="w-full max-w-md mx-auto mb-4 overflow-hidden">
      {/* Header */}
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-foreground">{user.username}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal size={16} className="text-muted-foreground" />
          </Button>
        </div>
        
        {/* Trip Title */}
        <h3 className="font-semibold text-lg mb-3 text-foreground">{trip.title}</h3>
        
        {/* Trip Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{trip.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Navigation size={14} />
            <span>{trip.distance}</span>
          </div>
        </div>
        
        {/* Carousel Content */}
        <div className="mb-4">
          <Carousel className="w-full">
            <CarouselContent>
              {/* Country Map with Route - Always First */}
              <CarouselItem>
                <div className="h-48 bg-muted rounded-lg overflow-hidden">
                  <CountryMap 
                    stops={trip.stops} 
                    className="h-full w-full" 
                    mapboxToken={mapboxToken}
                  />
                </div>
              </CarouselItem>
              
              {/* Photos */}
              {hasPhotos ? (
                photos.map((photo, index) => (
                  <CarouselItem key={index}>
                    <div className="h-48 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={photo} 
                        alt={`Trip photo ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg text-primary font-medium">{trip.photoCount}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Photos from {trip.stops[0]?.name || 'this trip'}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
        
        {/* Expandable Details */}
        {expandable && (trip.description || trip.highlights || trip.cost || trip.rating) && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto text-sm">
                <span>Trip details</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Trip Overview */}
              {(trip.date || trip.companions || trip.cost || trip.rating) && (
                <div className="grid grid-cols-2 gap-4">
                  {trip.date && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">{trip.date}</p>
                      </div>
                    </div>
                  )}
                  
                  {trip.companions && (
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">People</p>
                        <p className="text-sm font-medium">{trip.companions} travelers</p>
                      </div>
                    </div>
                  )}
                  
                  {trip.cost && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="text-sm font-medium">{trip.cost}</p>
                      </div>
                    </div>
                  )}
                  
                  {trip.rating && (
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Rating</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              className={i < trip.rating! ? "text-yellow-500 fill-current" : "text-muted-foreground"} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Locations */}
              {trip.stops && trip.stops.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-muted-foreground" />
                    <h4 className="font-medium text-sm">Locations</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trip.stops.map((stop, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {stop.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Description */}
              {trip.description && (
                <div>
                  <h4 className="font-medium text-sm mb-2">About this trip</h4>
                  <p className="text-sm text-muted-foreground">{trip.description}</p>
                </div>
              )}
              
              {/* Highlights */}
              {trip.highlights && trip.highlights.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Trip highlights</h4>
                  <div className="space-y-2">
                    {trip.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border mt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
              <Heart size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{stats.likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
              <MessageCircle size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{stats.comments}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Share size={16} className="text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripCard;