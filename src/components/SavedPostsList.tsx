import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, X, Plus } from "lucide-react";
import { SavedPost } from "@/hooks/useSavedPosts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import UnifiedPostCard from "@/components/UnifiedPostCard";

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

  const handleDeletePost = (postId: string) => {
    // This is handled by the parent component or could trigger unsaving
    console.log('Delete post:', postId);
  };
  
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

              // Convert saved post to the format expected by UnifiedPostCard
              const unifiedPost = {
                id: post.id,
                content: post.content || '',
                image_url: post.image_url,
                user_id: post.user_id,
                trip_id: post.trip_id,
                created_at: post.created_at,
                likes_count: 0, // Default values for saved posts
                comments_count: 0,
                is_private: false,
                profiles: post.profiles ? {
                  id: `profile-${post.user_id}`,
                  user_id: post.user_id,
                  name: post.profiles.name,
                  username: post.profiles.username,
                  avatar: post.profiles.avatar
                } : null,
                trips: post.trips ? {
                  id: post.id, // Use post id as trip id
                  title: post.trips.title,
                  duration: undefined,
                  distance: undefined,
                  cost: undefined,
                  companions: undefined,
                  stops: post.trips.stops,
                  images: undefined
                } : null
              };

              return (
                <UnifiedPostCard
                  key={savedPost.id}
                  post={unifiedPost}
                  onDelete={handleDeletePost}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPostsList;