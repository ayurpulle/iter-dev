import { useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, Users, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SavedPost } from "@/hooks/useSavedPosts";

interface SavedPostsListProps {
  yourSavedPosts: SavedPost[];
  friendsSavedPosts: SavedPost[];
  viewMode: "yours" | "friends";
  onViewModeChange: (mode: "yours" | "friends") => void;
  onHide: () => void;
}

const SavedPostsList = ({ 
  yourSavedPosts, 
  friendsSavedPosts, 
  viewMode, 
  onViewModeChange, 
  onHide 
}: SavedPostsListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const currentPosts = viewMode === "yours" ? yourSavedPosts : friendsSavedPosts;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            Saved Posts {viewMode === "friends" ? "from Friends" : ""}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHide}
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
            onClick={() => onViewModeChange("yours")}
            className="flex items-center gap-2 flex-1"
          >
            <User size={16} />
            Your Saved Posts ({yourSavedPosts.length})
          </Button>
          <Button
            variant={viewMode === "friends" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("friends")}
            className="flex items-center gap-2 flex-1"
          >
            <Users size={16} />
            Friends' Posts ({friendsSavedPosts.length})
          </Button>
        </div>
      </div>

      {/* Scrollable Posts List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          {currentPosts.map((savedPost) => {
            const post = savedPost.posts;
            if (!post) return null;

            return (
              <Card key={savedPost.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.profiles?.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {(post.profiles?.name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{post.profiles?.name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">@{post.profiles?.username || 'unknown'}</p>
                          {post.trips?.title && (
                            <p className="text-xs text-primary font-medium">{post.trips.title}</p>
                          )}
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
                  
                  {post.content && (
                    <p className="text-sm mb-3">{post.content}</p>
                  )}
                  
                  {/* Photo indicator */}
                  {post.image_url && (
                    <div className="bg-muted rounded-lg p-3 mb-3">
                      <p className="text-sm text-muted-foreground">
                        📸 Photo attached
                      </p>
                    </div>
                  )}
                  
                  {/* Trip info */}
                  {post.trips?.stops && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        🗺️ {post.trips.stops.length} stops
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {currentPosts.length === 0 && (
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
  );
};

export default SavedPostsList;