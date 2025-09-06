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
  const { yourSavedPosts, loading } = useSavedPosts();

  // Create pins from user's saved posts only
  const createPinsFromPosts = () => {
    // Convert saved posts to pins format for the globe
    return yourSavedPosts
      .filter(savedPost => savedPost.posts?.trips?.stops)
      .flatMap(savedPost => {
        const stops = savedPost.posts?.trips?.stops || [];
        return stops.map((stop: any, index: number) => ({
          location: stop.name || `Stop ${index + 1}`,
          lat: stop.lat || 0,
          lng: stop.lng || 0,
          friends: [savedPost.posts?.profiles?.name || 'You'],
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
      <TopBar />
      
      {/* Fullscreen Globe View - Respecting top and bottom bars */}
      <div className={`relative transition-all duration-500 ease-out ${
        showPostsList ? 'h-1/2' : 'h-full'
      } pt-16 pb-20`}>

        {/* Swipe up indicator - Above bottom bar */}
        {!showPostsList && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 shadow-lg">
              <p className="text-white/70 font-medium text-sm">Swipe up to see saved posts</p>
            </div>
          </div>
        )}

        {/* Fullscreen Interactive Globe - Centered between bars */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full">
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
          onHide={() => setShowPostsList(false)}
        />
      </div>

      {/* Bottom Tab Bar - Always visible */}
      <BottomTabBar />
    </div>
  );
};

export default MapView;