import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";
import LocationPopup from "@/components/LocationPopup";
import LocationTrips from "@/components/LocationTrips";
import TripPlanning from "@/components/TripPlanning";
import { Button } from "@/components/ui/button";

const MapView = () => {
  const [activeTab, setActiveTab] = useState<"map" | "planning">("map");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showFullList, setShowFullList] = useState(false);

  const handleLocationClick = (location: string) => {
    setSelectedLocation(location);
    setShowPopup(true);
  };

  const handlePopupClick = () => {
    setShowPopup(false);
    setShowFullList(true);
  };

  const handleBackToMap = () => {
    setShowPopup(false);
    setShowFullList(false);
    setSelectedLocation(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      {/* Back Button */}
      {(showPopup || showFullList) && (
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToMap}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Map
          </Button>
        </div>
      )}
      
      {/* Toggle Banner */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-center max-w-md mx-auto">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={activeTab === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("map")}
              className="px-6"
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

      <main className="flex-1">
        {activeTab === "map" && (
          <>
            <InteractiveMap onLocationClick={handleLocationClick} />
            {showPopup && selectedLocation && (
              <LocationPopup 
                location={selectedLocation} 
                onClose={handleBackToMap}
                onViewAll={handlePopupClick}
              />
            )}
            {showFullList && selectedLocation && (
              <LocationTrips 
                location={selectedLocation} 
                onClose={handleBackToMap}
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