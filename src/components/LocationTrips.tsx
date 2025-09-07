import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import CompactFriendsList from "./CompactFriendsList";
import { Badge } from "@/components/ui/badge";

const topTrips: any[] = [];
const suggestedAccents: any[] = [];

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold">Trips to {location}</h1>
              <p className="text-sm text-muted-foreground">See what your friends did here</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-4">
            <h2>Top Trips</h2>
            {topTrips.length === 0 ? (
              <p className="text-muted-foreground text-sm">No trips found for this location.</p>
            ) : (
              topTrips.map((trip, idx) => (
                <div key={idx}>
                  {trip.title}
                  {trip.tags?.map((tag: string) => <Badge key={tag}>{tag}</Badge>)}
                </div>
              ))
            )}

            <h2>Suggested Accents</h2>
            {suggestedAccents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No suggestions available.</p>
            ) : (
              suggestedAccents.map((accent, idx) => <div key={idx}>{accent}</div>)
            )}

            <CompactFriendsList filterLocation={location} onTripClick={onTripClick} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationTrips;