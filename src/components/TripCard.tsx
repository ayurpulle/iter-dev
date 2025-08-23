import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share, MoreHorizontal, Clock, Navigation } from "lucide-react";
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
  };
  stats: {
    likes: number;
    comments: number;
  };
}

const TripCard: React.FC<TripCardProps> = ({ user, trip, stats }) => {
  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
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
            <span>Trip Time: {trip.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Navigation size={14} />
            <span>Distance: {trip.distance}</span>
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Mini Map */}
          <div className="space-y-2">
            <MiniMap stops={trip.stops} className="h-24" />
          </div>
          
          {/* Photo Section */}
          <div className="space-y-2">
            <div className="bg-muted rounded-lg h-24 flex items-center justify-center overflow-hidden">
              {trip.coverImage ? (
                <img 
                  src={trip.coverImage} 
                  alt="Trip photo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1">
                    <span className="text-xs text-primary font-medium">{trip.photoCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center leading-tight">
                    Photos of your trip to {trip.stops[0]?.name || 'destination'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
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