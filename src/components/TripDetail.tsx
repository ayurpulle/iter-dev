import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Calendar, Users, Star, DollarSign, Plus } from "lucide-react";

interface TripDetailProps {
  friendTrip: {
    friend: {
      name: string;
      username: string;
      initials: string;
    };
    trip: {
      title: string;
      duration: string;
      date: string;
      locations: string[];
      companions: number;
      description: string;
      highlights: string[];
      cost: string;
      rating: number;
    };
  };
  onClose: () => void;
}

const TripDetail = ({ friendTrip, onClose }: TripDetailProps) => {
  const { friend, trip } = friendTrip;

  const handleSaveTrip = () => {
    // TODO: Add trip to user's trip bank
    console.log("Saving trip to bank:", friendTrip);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">{trip.title}</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Friend Info */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {friend.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">{friend.name}</h3>
                  <p className="text-sm text-muted-foreground">@{friend.username}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Overview */}
          <Card className="mb-6">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{trip.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">People</p>
                    <p className="text-sm font-medium">{trip.companions} travelers</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="text-sm font-medium">{trip.cost}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={12} 
                          className={i < trip.rating ? "text-yellow-500 fill-current" : "text-muted-foreground"} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="text-sm font-medium">{trip.duration}</p>
              </div>
            </CardContent>
          </Card>

          {/* Locations */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-muted-foreground" />
                <h3 className="font-medium">Locations</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {trip.locations.map((location, index) => (
                  <Badge key={index} variant="secondary">
                    {location}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">About this trip</h3>
              <p className="text-sm text-muted-foreground">{trip.description}</p>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Trip highlights</h3>
              <div className="space-y-2">
                {trip.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{highlight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save to Trip Bank Button */}
          <Button 
            onClick={handleSaveTrip}
            className="w-full mb-6"
            size="lg"
          >
            <Plus size={20} className="mr-2" />
            Save to My Trip Bank
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;