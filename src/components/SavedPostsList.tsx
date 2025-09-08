import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SavedPost } from "@/hooks/useSavedPosts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SavedPostsListProps {
  yourSavedPosts: SavedPost[];
  onHide: () => void;
}

const SavedPostsList = ({ 
  yourSavedPosts = [], 
  onHide 
}: SavedPostsListProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [folders, setFolders] = useState<{id: string, name: string}[]>([]);

  // Fetch user's folders
  useEffect(() => {
    const fetchFolders = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('item_folders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFolders(data || []);
      } catch (error) {
        console.error('Error fetching folders:', error);
      }
    };

    fetchFolders();
  }, [user]);
  
  const filteredPosts = selectedFolder === "all" 
    ? yourSavedPosts 
    : yourSavedPosts.filter(post => post.folder_id === selectedFolder);

  return (
    <div className="h-full flex flex-col">
      {/* Header with folder dropdown */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Your Saved Posts</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {selectedFolder === "all" ? "All" : folders.find(f => f.id === selectedFolder)?.name || "Select folder"}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedFolder("all")}>
                All
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem 
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  {folder.name}
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
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-4">
                <Plus size={48} className="mx-auto text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-2">Save posts to fill up your world!</p>
              <p className="text-sm">Discover amazing places through your friends' adventures</p>
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
                            <Plus size={16} className="text-primary" />
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