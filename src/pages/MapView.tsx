import { useState } from "react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";
import FriendsList from "@/components/FriendsList";
import { Button } from "@/components/ui/button";

const MapView = () => {
  const [activeTab, setActiveTab] = useState<"trips" | "friends">("trips");

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      {/* Toggle Banner */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-center max-w-md mx-auto">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={activeTab === "trips" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("trips")}
              className="px-6"
            >
              Trips
            </Button>
            <Button
              variant={activeTab === "friends" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("friends")}
              className="px-6"
            >
              Friends
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {activeTab === "trips" ? (
          <InteractiveMap />
        ) : (
          <FriendsList />
        )}
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default MapView;