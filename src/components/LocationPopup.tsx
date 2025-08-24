import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Users, Calendar } from "lucide-react";

interface LocationPopupProps {
  location: string;
  onClose: () => void;
  onViewAll: () => void;
}

const LocationPopup = ({ location, onClose, onViewAll }: LocationPopupProps) => {
  // Mock data - should match the trips from CompactFriendsList
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

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{location}</h3>
              <p className="text-sm text-muted-foreground">
                {locationTrips.length} friend{locationTrips.length !== 1 ? 's' : ''} visited
              </p>
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

          <div className="space-y-3 mb-4">
            {locationTrips.slice(0, 2).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {item.friend.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.friend.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar size={10} />
                    <span>{item.trip.date}</span>
                    <Users size={10} />
                    <span>{item.trip.companions}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {locationTrips.length > 2 && (
              <p className="text-xs text-muted-foreground text-center">
                +{locationTrips.length - 2} more trip{locationTrips.length - 2 !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <Button 
            onClick={onViewAll}
            className="w-full"
            size="sm"
          >
            View All Trips
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPopup;