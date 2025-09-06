import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, User } from "lucide-react";
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
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Fullscreen Globe View */}
      <div className={`relative transition-all duration-500 ease-out ${showPostsList ? 'h-1/2' : 'h-full'}`}>
        {/* Toggle Button - Top Left */}
        <div className="absolute top-6 left-6 z-50">
          <div className="flex bg-black/30 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-2xl">
            <Button
              variant={viewMode === "yours" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("yours")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === "yours" 
                  ? "bg-white/20 text-white shadow-lg" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <User size={16} />
              Yours
            </Button>
            <Button
              variant={viewMode === "friends" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("friends")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === "friends" 
                  ? "bg-white/20 text-white shadow-lg" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Users size={16} />
              Friends
            </Button>
          </div>
        </div>

        {/* Swipe up indicator at bottom center */}
        {!showPostsList && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 shadow-lg">
              <p className="text-white/70 font-medium text-sm">Swipe up to see saved posts</p>
            </div>
          </div>
        )}

        {/* Fullscreen Interactive Globe */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full max-w-4xl max-h-4xl">
            <InteractiveGlobe pins={pins} onPinClick={handlePinClick} />
          </div>
        </div>
      </div>

      {/* Saved Posts List - Slides up from bottom */}
      <div className={`fixed bottom-0 left-0 right-0 bg-background border-t transition-all duration-500 ease-out ${
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

      {/* Bottom Tab Bar - Only show when posts list is not visible */}
      {!showPostsList && <BottomTabBar />}
    </div>
  );
};

export default MapView;