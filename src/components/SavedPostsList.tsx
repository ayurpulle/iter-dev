import { useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, ChevronDown, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SavedPost } from "@/hooks/useSavedPosts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SavedPostsListProps {
  yourSavedPosts: SavedPost[];
  onHide: () => void;
}

const SavedPostsList = ({ 
  yourSavedPosts = [], 
  onHide 
}: SavedPostsListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  
  // Group posts by folders (this would come from actual folder data in the future)
  const folders = ["all", "favorites", "travel", "food"];
  
  const filteredPosts = selectedFolder === "all" 
    ? yourSavedPosts 
    : yourSavedPosts.filter(post => {
        // This would filter by actual folder data when implemented
        return selectedFolder === "all";
      });

  return (
    <div className="h-full flex flex-col">
      {/* Header with folder dropdown */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Your Saved Posts</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {selectedFolder === "all" ? "All" : selectedFolder}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {folders.map((folder) => (
                <DropdownMenuItem 
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                >
                  {folder === "all" ? "All" : folder.charAt(0).toUpperCase() + folder.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button variant="ghost" size="sm" onClick={onHide}>
          <X size={18} />
        </Button>
      </div>

      {/* Scrollable Posts List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No saved posts yet</p>
            </div>
          ) : (
            filteredPosts.map((savedPost) => {
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
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPostsList;