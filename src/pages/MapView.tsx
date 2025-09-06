import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Users, User } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import InteractiveMap from "@/components/InteractiveMap";
import { formatDistanceToNow } from "date-fns";

interface SavedPost {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  content: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  photos: string[];
  tags: string[];
  created_at: string;
  isFriend: boolean;
}

const MapView = () => {
  const [showPostsList, setShowPostsList] = useState(false);
  const [viewMode, setViewMode] = useState<"yours" | "friends">("yours");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mock saved posts data
  const [savedPosts] = useState<SavedPost[]>([
    {
      id: "1",
      user: {
        name: "You",
        username: "you",
        avatar: ""
      },
      content: "Amazing sunset at Santorini! The views were absolutely breathtaking 🌅",
      location: {
        name: "Santorini, Greece",
        lat: 36.3932,
        lng: 25.4615
      },
      photos: ["santorini1.jpg", "santorini2.jpg"],
      tags: ["#sunset", "#greece", "#travel"],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      isFriend: false
    },
    {
      id: "2",
      user: {
        name: "Sarah Johnson",
        username: "sarah_j",
        avatar: ""
      },
      content: "Tokyo street food tour was incredible! So many flavors to discover 🍜",
      location: {
        name: "Tokyo, Japan",
        lat: 35.6762,
        lng: 139.6503
      },
      photos: ["tokyo1.jpg"],
      tags: ["#food", "#tokyo", "#streetfood"],
      created_at: new Date(Date.now() - 172800000).toISOString(),
      isFriend: true
    },
    {
      id: "3",
      user: {
        name: "You",
        username: "you",
        avatar: ""
      },
      content: "Hiking the Alps was challenging but so rewarding! 🏔️",
      location: {
        name: "Swiss Alps, Switzerland",
        lat: 46.5197,
        lng: 7.4815
      },
      photos: ["alps1.jpg", "alps2.jpg", "alps3.jpg"],
      tags: ["#hiking", "#mountains", "#adventure"],
      created_at: new Date(Date.now() - 259200000).toISOString(),
      isFriend: false
    },
    {
      id: "4",
      user: {
        name: "Mike Chen",
        username: "mike_c",
        avatar: ""
      },
      content: "Northern Lights in Iceland were absolutely magical! ✨",
      location: {
        name: "Reykjavik, Iceland",
        lat: 64.1466,
        lng: -21.9426
      },
      photos: ["iceland1.jpg"],
      tags: ["#northernlights", "#iceland", "#aurora"],
      created_at: new Date(Date.now() - 345600000).toISOString(),
      isFriend: true
    }
  ]);

  const filteredPosts = savedPosts.filter(post => 
    viewMode === "yours" ? !post.isFriend : post.isFriend
  );

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

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      {/* Globe View */}
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

        {/* Swipe Indicator */}
        {!showPostsList && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 border shadow-lg">
              <p className="text-sm text-muted-foreground">Swipe up to see saved posts</p>
            </div>
          </div>
        )}

        {/* Fullscreen Globe */}
        <div className="absolute inset-0">
          <InteractiveMap />
        </div>
      </div>

      {/* Posts List - Slides up from bottom */}
      <div className={`fixed bottom-0 left-0 right-0 bg-background border-t transition-transform duration-300 ${
        showPostsList ? 'translate-y-0' : 'translate-y-full'
      }`} style={{ height: '50vh' }}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Saved Posts {viewMode === "friends" ? "from Friends" : ""}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPostsList(false)}
              className="text-muted-foreground"
            >
              Hide
            </Button>
          </div>
          
          {/* Toggle buttons for list view */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "yours" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("yours")}
              className="flex items-center gap-2 flex-1"
            >
              <User size={16} />
              Your Saved Posts ({savedPosts.filter(p => !p.isFriend).length})
            </Button>
            <Button
              variant={viewMode === "friends" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("friends")}
              className="flex items-center gap-2 flex-1"
            >
              <Users size={16} />
              Friends' Posts ({savedPosts.filter(p => p.isFriend).length})
            </Button>
          </div>
        </div>

        {/* Scrollable Posts List */}
        <div ref={scrollRef} className="overflow-y-auto h-full pb-20">
          <div className="p-4 space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.user.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {post.user.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{post.user.name}</p>
                          <p className="text-xs text-muted-foreground">@{post.user.username}</p>
                          <p className="text-xs text-primary font-medium">{post.location.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                          <Bookmark size={16} className="text-primary fill-current" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3">{post.content}</p>
                  
                  {/* Photo count indicator */}
                  {post.photos.length > 0 && (
                    <div className="bg-muted rounded-lg p-3 mb-3">
                      <p className="text-sm text-muted-foreground">
                        📸 {post.photos.length} photo{post.photos.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {filteredPosts.length === 0 && (
              <div className="text-center py-8">
                <Bookmark size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No saved posts {viewMode === "friends" ? "from friends" : ""} yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default MapView;