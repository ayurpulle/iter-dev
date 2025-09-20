import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SavedPost } from "@/hooks/useSavedPosts";
import ClickableUserInfo from "@/components/ClickableUserInfo";

interface LocationPostsListProps {
  location: string;
  posts: SavedPost[];
  onClose: () => void;
}

const LocationPostsList = ({ location, posts, onClose }: LocationPostsListProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            <div>
              <h3 className="font-semibold text-lg">{location}</h3>
              <p className="text-sm text-muted-foreground">{posts.length} saved posts</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Posts List */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4">
          {posts.map((savedPost) => {
            const post = savedPost.posts;
            if (!post) return null;

            return (
              <Card key={savedPost.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <ClickableUserInfo
                      username={post.profiles?.username}
                      name={post.profiles?.name}
                      avatar={post.profiles?.avatar}
                      userId={post.user_id}
                      className="flex items-start gap-3 flex-1"
                    >
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
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </ClickableUserInfo>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LocationPostsList;