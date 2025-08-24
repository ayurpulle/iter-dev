import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";

const MapView = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="flex-1">
        <InteractiveMap />
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default MapView;