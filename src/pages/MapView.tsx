import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, User } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveGlobe from "@/components/InteractiveGlobe";
import SavedPostsList from "@/components/SavedPostsList";
import { useSavedPosts } from "@/hooks/useSavedPosts";

const MapView = () => {
  const [showPostsList, setShowPostsList] = useState(false);
  const [viewMode, setViewMode] = useState<"yours" | "friends">("yours");
  const { yourSavedPosts, friendsSavedPosts, loading } = useSavedPosts();

  // Mock pins for the globe based on saved posts
  const createPinsFromPosts = () => {
    const allPosts = viewMode === "yours" ? yourSavedPosts : friendsSavedPosts;
    
    // Convert saved posts to pins format for the globe
    return allPosts
      .filter(savedPost => savedPost.posts?.trips?.stops)
      .flatMap(savedPost => {
        const stops = savedPost.posts?.trips?.stops || [];
        return stops.map((stop: any, index: number) => ({
          location: stop.name || `Stop ${index + 1}`,
          lat: stop.lat || 0,
          lng: stop.lng || 0,
          friends: [savedPost.posts?.profiles?.name || 'Unknown'],
          trips: 1
        }));
      });
  };

  const pins = createPinsFromPosts();

  // Handle swipe up gesture
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = () => {
      const deltaY = startY - currentY;
      
      // If swiped up by at least 50px, show posts list
      if (deltaY > 50 && !showPostsList) {
        setShowPostsList(true);
      }
      // If swiped down by at least 50px, hide posts list
      else if (deltaY < -50 && showPostsList) {
        setShowPostsList(false);
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showPostsList]);

  const handlePinClick = (pin: any) => {
    // Could implement pin detail functionality here
    console.log('Pin clicked:', pin);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading saved posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      {/* Fullscreen Globe View */}
      <div className={`relative transition-all duration-300 ${showPostsList ? 'h-1/2' : 'h-full'}`}>
        {/* Toggle Button - Top Left */}
        <div className="absolute top-4 left-4 z-50">
          <div className="flex bg-background/90 backdrop-blur-sm rounded-lg p-1 border shadow-lg">
            <Button
              variant={viewMode === "yours" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("yours")}
              className="flex items-center gap-2 px-3"
            >
              <User size={16} />
              Yours
            </Button>
            <Button
              variant={viewMode === "friends" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("friends")}
              className="flex items-center gap-2 px-3"
            >
              <Users size={16} />
              Friends
            </Button>
          </div>
        </div>

        {/* Fullscreen Interactive Globe */}
        <div className="absolute inset-0">
          <InteractiveGlobe pins={pins} onPinClick={handlePinClick} />
        </div>
      </div>

      {/* Saved Posts List - Slides up from bottom */}
      <div className={`fixed bottom-0 left-0 right-0 bg-background border-t transition-transform duration-300 ${
        showPostsList ? 'translate-y-0' : 'translate-y-full'
      }`} style={{ height: '50vh' }}>
        <SavedPostsList
          yourSavedPosts={yourSavedPosts}
          friendsSavedPosts={friendsSavedPosts}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onHide={() => setShowPostsList(false)}
        />
      </div>

      <BottomTabBar />
    </div>
  );
};

export default MapView;