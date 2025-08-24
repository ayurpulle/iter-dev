import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Plus, X } from "lucide-react";
import TripDetail from "./TripDetail";

interface CompactFriendsListProps {
  filterLocation?: string;
  onTripClick?: (trip: any) => void;
}

const CompactFriendsList = ({ filterLocation, onTripClick }: CompactFriendsListProps) => {
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  
  
  const friendsTrips = [
    {
      friend: {
        name: "Sarah Johnson",
        username: "sarahj",
        initials: "SJ",
      },
      trip: {
        title: "Japan Adventure",
        duration: "14 days",
        date: "March 2024",
        locations: ["Tokyo", "Kyoto", "Osaka"],
        companions: 3,
        description: "Amazing cultural experience exploring ancient temples, modern cities, and incredible food.",
        highlights: ["Cherry blossom viewing", "Temple visits", "Sushi making class", "Bullet train rides"],
        cost: "$3,200",
        rating: 5,
      },
    },
    {
      friend: {
        name: "Mike Chen",
        username: "mikechen",
        initials: "MC",
      },
      trip: {
        title: "Iceland Road Trip",
        duration: "8 days",
        date: "February 2024",
        locations: ["Reykjavik", "Blue Lagoon", "Northern Lights"],
        companions: 1,
        description: "Breathtaking landscapes and natural wonders around the Ring Road.",
        highlights: ["Northern Lights", "Blue Lagoon", "Geysir", "Waterfalls"],
        cost: "$2,100",
        rating: 4,
      },
    },
    {
      friend: {
        name: "Emma Wilson",
        username: "emmaw",
        initials: "EW",
      },
      trip: {
        title: "Mediterranean Cruise",
        duration: "12 days",
        date: "January 2024",
        locations: ["Barcelona", "Rome", "Athens", "Santorini"],
        companions: 5,
        description: "Luxurious cruise through historic Mediterranean ports.",
        highlights: ["Colosseum tour", "Santorini sunset", "Barcelona beaches", "Greek islands"],
        cost: "$2,800",
        rating: 5,
      },
    },
    {
      friend: {
        name: "Alex Rodriguez",
        username: "alexr",
        initials: "AR",
      },
      trip: {
        title: "Thailand Backpacking",
        duration: "21 days",
        date: "December 2023",
        locations: ["Bangkok", "Chiang Mai", "Phuket"],
        companions: 2,
        description: "Budget-friendly adventure through Thailand's diverse regions.",
        highlights: ["Street food tours", "Elephant sanctuary", "Beach hopping", "Temple visits"],
        cost: "$1,400",
        rating: 4,
      },
    },
  ];

  // Filter trips by location if specified
  const filteredTrips = filterLocation 
    ? friendsTrips.filter(item => 
        item.trip.locations.some(loc => 
          loc.toLowerCase().includes(filterLocation.toLowerCase()) || 
          filterLocation.toLowerCase().includes(loc.toLowerCase())
        )
      )
    : friendsTrips;

  const handleTripClick = (friendTrip: any) => {
    if (onTripClick) {
      onTripClick(friendTrip);
    } else {
      setSelectedTrip(friendTrip);
    }
  };

  const handleSaveTrip = (e: React.MouseEvent, friendTrip: any) => {
    e.stopPropagation();
    // TODO: Add trip to user's trip bank
    console.log("Saving trip:", friendTrip);
  };

  if (selectedTrip) {
    return (
      <TripDetail 
        friendTrip={selectedTrip} 
        onClose={() => setSelectedTrip(null)} 
      />
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="space-y-3">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No trips found for {filterLocation}</p>
          </div>
        ) : (
          filteredTrips.map((item, index) => (
          <Card 
            key={index} 
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleTripClick(item)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {item.friend.initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-foreground truncate">{item.friend.name}</h3>
                      <h4 className="font-semibold text-xs text-primary truncate">{item.trip.title}</h4>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{item.trip.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={10} />
                          <span>{item.trip.companions}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground"
                      onClick={(e) => handleSaveTrip(e, item)}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin size={10} />
                    <span className="truncate">{item.trip.locations.join(" → ")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CompactFriendsList;