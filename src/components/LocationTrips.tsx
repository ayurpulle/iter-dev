import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import CompactFriendsList from "./CompactFriendsList";

interface LocationTripsProps {
  location: string;
  onClose: () => void;
  onTripClick: (trip: any) => void;
}

const LocationTrips = ({ location, onClose, onTripClick }: LocationTripsProps) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-40 overflow-y-auto">
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold">Trips to {location}</h1>
              <p className="text-sm text-muted-foreground">See what your friends did here</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Friends trips for this location */}
          <div className="space-y-4">
            <CompactFriendsList filterLocation={location} onTripClick={onTripClick} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationTrips;