import { useState } from 'react';
import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";
import LocationPopup from "@/components/LocationPopup";
import LocationTrips from "@/components/LocationTrips";
import TripDetail from "@/components/TripDetail";
import TripPlanning from "@/components/TripPlanning";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MapView = () => {
  const [activeTab, setActiveTab] = useState("friends"); // Default to friends
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [viewLevel, setViewLevel] = useState<"map" | "popup" | "list" | "detail">("map");
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  const handleLocationClick = (location: string) => {
    setSelectedLocation(location);
    setViewLevel("popup");
  };

  const handlePopupClick = () => {
    setViewLevel("list");
  };

  const handleTripClick = (trip: any) => {
    setSelectedTrip(trip);
    setViewLevel("detail");
  };

  const handleBackClick = () => {
    switch (viewLevel) {
      case "detail":
        setViewLevel("list");
        setSelectedTrip(null);
        break;
      case "list":
        setViewLevel("popup");
        break;
      case "popup":
        setViewLevel("map");
        setSelectedLocation(null);
        break;
      default:
        setViewLevel("map");
        setSelectedLocation(null);
        setSelectedTrip(null);
    }
  };

  const getBackButtonText = () => {
    switch (viewLevel) {
      case "detail":
        return "Back to List";
      case "list":
        return "Back to Location";
      case "popup":
        return "Back to Map";
      default:
        return "Back";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      {/* Back Button - Only show when in detail views */}
      {viewLevel !== "map" && (
        <div className="absolute top-16 left-4 z-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackClick}
            className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border shadow-lg"
          >
            <ArrowLeft size={16} />
            {getBackButtonText()}
          </Button>
        </div>
      )}
      
      <main className="flex-1 relative">
        {/* Toggle Banner - Only show when on main map view */}
        {viewLevel === "map" && (
          <div className="bg-background border-b border-border px-4 py-3">
            <div className="flex items-center justify-center max-w-md mx-auto">
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={activeTab === "friends" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("friends")}
                  className="px-4"
                >
                  Friends
                </Button>
                <Button
                  variant={activeTab === "plan" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("plan")}
                  className="px-6"
                >
                  Plan Trip
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content based on active tab and view level */}
        {viewLevel === "map" && (
          <div className="px-4 py-6">
            {activeTab === "friends" && (
              <div className="max-w-md mx-auto">
                <InteractiveMap onLocationClick={handleLocationClick} />
              </div>
            )}
            
            {activeTab === "plan" && (
              <TripPlanning />
            )}
          </div>
        )}

        {/* Location Popup */}
        {viewLevel === "popup" && selectedLocation && (
          <LocationPopup 
            location={selectedLocation} 
            onClose={() => setViewLevel("map")}
            onViewAll={handlePopupClick}
          />
        )}

        {/* Location Trip List */}
        {viewLevel === "list" && selectedLocation && (
          <LocationTrips 
            location={selectedLocation}
            onClose={() => setViewLevel("popup")}
            onTripClick={handleTripClick}
          />
        )}

        {/* Trip Detail */}
        {viewLevel === "detail" && selectedTrip && (
          <TripDetail 
            friendTrip={selectedTrip}
            onClose={() => setViewLevel("list")}
          />
        )}
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default MapView;