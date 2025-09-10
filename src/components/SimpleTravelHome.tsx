import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrips } from "@/hooks/useTrips";
import {
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Loader2
} from "lucide-react";

const SimpleTravelHome = () => {
  const [activeTab, setActiveTab] = useState("discover");
  const { getPublicTrips, getUserTrips, loading } = useTrips();
  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [userTrips, setUserTrips] = useState<any[]>([]);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        if (activeTab === "discover") {
          const trips = await getPublicTrips();
          setPublicTrips(trips || []);
        } else if (activeTab === "my-trips") {
          const trips = await getUserTrips();
          setUserTrips(trips || []);
        }
      } catch (error) {
        console.error('Error loading trips:', error);
      }
    };

    loadTrips();
  }, [activeTab, getPublicTrips, getUserTrips]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCostDisplay = (cost: string) => {
    const costMap: { [key: string]: string } = {
      '$': 'Budget',
      '$$': 'Moderate', 
      '$$$': 'Expensive',
      '$$$$': 'Luxury',
      '$$$$$': 'Ultra Luxury'
    };
    return costMap[cost] || cost;
  };

  const renderTripCard = (trip: any) => (
    <Card key={trip.id} className="overflow-hidden">
      <CardContent className="p-0">
        {/* Trip Images */}
        {trip.images && trip.images.length > 0 && (
          <div className="relative overflow-hidden" style={{ height: "256px" }}>
            <img
              src={trip.images[0]}
              alt={trip.title}
              className="w-full h-full object-cover object-center"
            />
            {trip.images.length > 1 && (
              <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                +{trip.images.length - 1} more
              </Badge>
            )}
          </div>
        )}

        {/* Trip Content */}
        <div className="p-4 space-y-3">
          {/* User Info */}
          {trip.profiles && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-semibold text-primary-foreground">
                {(trip.profiles.name || trip.profiles.username || 'U')[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">
                {trip.profiles.name || trip.profiles.username || 'Anonymous'}
              </span>
            </div>
          )}

          {/* Trip Title */}
          <h3 className="text-lg font-semibold">{trip.title}</h3>

          {/* Trip Description */}
          {trip.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {trip.description}
            </p>
          )}

          {/* Trip Details */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {trip.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(trip.created_at)}
              </div>
            )}
            
            {trip.stops && trip.stops.length > 0 && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {trip.stops.length} stops
              </div>
            )}

            {trip.cost && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {getCostDisplay(trip.cost)}
              </div>
            )}

            {trip.companions && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {trip.companions}
              </div>
            )}
          </div>

          {/* Trip Stats */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Heart className="h-4 w-4 mr-1" />
                0
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MessageCircle className="h-4 w-4 mr-1" />
                0
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const tripsToShow = activeTab === "discover" ? publicTrips : userTrips;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 overflow-x-auto">
        <Button
          variant={activeTab === "discover" ? "default" : "outline"}
          onClick={() => setActiveTab("discover")}
        >
          Discover
        </Button>
        <Button
          variant={activeTab === "my-trips" ? "default" : "outline"}
          onClick={() => setActiveTab("my-trips")}
        >
          My Trips
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading trips...</span>
          </div>
        ) : tripsToShow.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === "my-trips" ? "No trips yet" : "No public trips available"}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === "my-trips" 
                ? "Create your first trip to start sharing your adventures!"
                : "Be the first to share a public trip with the community!"
              }
            </p>
          </div>
        ) : (
          tripsToShow.map(renderTripCard)
        )}
      </div>
    </div>
  );
};

export default SimpleTravelHome;