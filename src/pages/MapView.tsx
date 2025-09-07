import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, User } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveGlobe from "@/components/InteractiveGlobe";
import SavedPostsList from "@/components/SavedPostsList";
import LocationPostsList from "@/components/LocationPostsList";
import { useSavedPosts, SavedPost } from "@/hooks/useSavedPosts";

const MapView = () => {
  const [showPostsList, setShowPostsList] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{location: string; posts: SavedPost[]} | null>(null);
  const { yourSavedPosts, loading } = useSavedPosts();

  // Create pins from user's saved posts only
  const createPinsFromPosts = () => {
    // Group saved posts by location
    const locationGroups: { [key: string]: { location: string; lat: number; lng: number; posts: SavedPost[] } } = {};
    
    yourSavedPosts
      .filter(savedPost => savedPost.posts?.trips?.stops)
      .forEach(savedPost => {
        const stops = savedPost.posts?.trips?.stops || [];
        stops.forEach((stop: any) => {
          const locationKey = `${stop.lat}-${stop.lng}`;
          if (!locationGroups[locationKey]) {
            locationGroups[locationKey] = {
              location: stop.name || 'Unknown Location',
              lat: stop.lat || 0,
              lng: stop.lng || 0,
              posts: []
            };
          }
          locationGroups[locationKey].posts.push(savedPost);
        });
      });

    // Convert to pins format
    return Object.values(locationGroups).map(group => ({
      location: group.location,
      lat: group.lat,
      lng: group.lng,
      friends: Array.from(new Set(group.posts.map(post => post.posts?.profiles?.name || 'Unknown'))),
      trips: group.posts.length,
      posts: group.posts // Add posts data for click handling
    }));
  };

  const pins = createPinsFromPosts();

  // Remove the global drag listeners since we now use a specific drag area
  // No useEffect needed for drag handling

  const handlePinClick = (pin: any) => {
    // Show posts for this location
    setSelectedLocation({
      location: pin.location,
      posts: pin.posts || []
    });
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
    <div className="fixed inset-0">
      <TopBar />
      
      {/* Globe Container - Full height between bars */}
      <div className="absolute top-16 bottom-20 left-0 right-0">
        <InteractiveGlobe pins={pins} onPinClick={handlePinClick} />
      </div>

      {/* Drag Area - Only bottom portion for swipe gesture */}
      <div 
        className="absolute bottom-20 left-0 right-0 h-32 z-30 pointer-events-auto"
        onTouchStart={(e) => {
          const startY = e.touches[0].clientY;
          const handleTouchMove = (moveE: TouchEvent) => {
            const currentY = moveE.touches[0].clientY;
            const deltaY = startY - currentY;
            if (deltaY > 50 && !showPostsList) {
              setShowPostsList(true);
              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
            }
          };
          const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', handleTouchEnd);
        }}
        onMouseDown={(e) => {
          const startY = e.clientY;
          const handleMouseMove = (moveE: MouseEvent) => {
            const currentY = moveE.clientY;
            const deltaY = startY - currentY;
            if (deltaY > 50 && !showPostsList) {
              setShowPostsList(true);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            }
          };
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        {/* Swipe up indicator - Only visible when posts are hidden */}
        {!showPostsList && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 shadow-lg">
              <p className="text-white/70 font-medium text-sm">Drag up to see saved posts</p>
            </div>
          </div>
        )}
      </div>

      {/* Saved Posts List - Slides up from bottom, above bottom bar */}
      <div 
        className={`fixed left-0 right-0 bg-background border-t transition-all duration-500 ease-out z-40 ${
          showPostsList ? 'bottom-20' : '-bottom-full'
        }`} 
        style={{ 
          height: showPostsList ? 'calc(100vh - 10rem)' : '0px',
          maxHeight: 'calc(100vh - 10rem)'
        }}
      >
        {showPostsList && (
          <SavedPostsList
            yourSavedPosts={yourSavedPosts}
            onHide={() => setShowPostsList(false)}
          />
        )}
      </div>

      {/* Location Posts Modal */}
      {selectedLocation && (
        <LocationPostsList
          location={selectedLocation.location}
          posts={selectedLocation.posts}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {/* Bottom Tab Bar - Always visible at bottom */}
      <BottomTabBar />
    </div>
  );
};

export default MapView;