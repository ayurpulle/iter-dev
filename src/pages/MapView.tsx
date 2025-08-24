import { useState } from "react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";
import CompactFriendsList from "@/components/CompactFriendsList";
import TripPlanning from "@/components/TripPlanning";
import { Button } from "@/components/ui/button";

const MapView = () => {
  const [activeTab, setActiveTab] = useState<"map" | "friends" | "planning">("map");

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
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
              variant={activeTab === "friends" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("friends")}
              className="px-6"
            >
              Friends
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
        {activeTab === "map" && <InteractiveMap />}
        {activeTab === "friends" && <CompactFriendsList />}
        {activeTab === "planning" && <TripPlanning />}
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default MapView;