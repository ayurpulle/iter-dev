import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Users, Calendar, MapPin, Clock, DollarSign, Loader2 } from "lucide-react";
import { LocationDataService, type LocationInfo } from "@/services/LocationDataService";

interface LocationPopupProps {
  location: string;
  onClose: () => void;
  onViewAll: () => void;
}

const LocationPopup = ({ location, onClose, onViewAll }: LocationPopupProps) => {
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocationInfo = async () => {
      setLoading(true);
      try {
        const info = await LocationDataService.getLocationInfo(location);
        setLocationInfo(info);
      } catch (error) {
        console.error('Error loading location info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLocationInfo();
  }, [location]);
  const friendsTrips = [
    {
      friend: {
        name: "Sarah Johnson",
        initials: "SJ",
      },
      trip: {
        title: "Japan Adventure",
        date: "March 2024",
        locations: ["Tokyo", "Kyoto", "Osaka"],
        companions: 3,
      },
    },
    {
      friend: {
        name: "Emma Wilson",
        initials: "EW",
      },
      trip: {
        title: "Mediterranean Cruise",
        date: "January 2024",
        locations: ["Barcelona", "Rome", "Athens", "Santorini"],
        companions: 5,
      },
    },
  ];

  // Filter trips for this location
  const locationTrips = friendsTrips.filter(item => 
    item.trip.locations.some(loc => 
      loc.toLowerCase().includes(location.toLowerCase()) || 
      location.toLowerCase().includes(loc.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading location info...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!locationInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">{locationInfo.name}</h3>
                <p className="text-sm text-muted-foreground">{locationInfo.country}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locationInfo.description}
            </p>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Things to Do</span>
              </div>
              <ul className="space-y-1">
                {locationInfo.thingsToDo.map((activity, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                    {activity}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm">{locationInfo.bestSeason}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm">{locationInfo.priceRange}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={onViewAll}
            className="w-full"
            size="sm"
          >
            Plan Trip Here
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPopup;