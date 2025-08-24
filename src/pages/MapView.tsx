import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";
import LocationPopup from "@/components/LocationPopup";
import LocationTrips from "@/components/LocationTrips";
import TripDetail from "@/components/TripDetail";
import TripPlanning from "@/components/TripPlanning";
import { Button } from "@/components/ui/button";

const MapView = () => {
  const [activeTab, setActiveTab] = useState<"map" | "planning">("map");
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
      
      {/* Back Button - 2-tier system */}
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
      
      {/* Toggle Banner - Only show when not viewing location details */}
      {viewLevel === "map" && (
        <div className="bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-center max-w-md mx-auto">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={activeTab === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("map")}
                className="px-4"
              >
                Map
              </Button>
              <Button
                variant={activeTab === "planning" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("planning")}
                className="px-6"
              >
                Plan Trip
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 relative">
        {activeTab === "map" && (
          <>
            <InteractiveMap onLocationClick={handleLocationClick} />
            {viewLevel === "popup" && selectedLocation && (
              <LocationPopup 
                location={selectedLocation} 
                onClose={handleBackClick}
                onViewAll={handlePopupClick}
              />
            )}
            {viewLevel === "list" && selectedLocation && (
              <LocationTrips 
                location={selectedLocation} 
                onClose={handleBackClick}
                onTripClick={handleTripClick}
              />
            )}
            {viewLevel === "detail" && selectedTrip && (
              <TripDetail 
                friendTrip={selectedTrip} 
                onClose={handleBackClick}
              />
            )}
          </>
        )}
        {activeTab === "planning" && <TripPlanning />}
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default MapView;