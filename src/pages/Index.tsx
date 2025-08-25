import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TopBar from "@/components/TopBar";
import TripCard from "@/components/TripCard";
import BottomTabBar from "@/components/BottomTabBar";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  content: string;
  trip_id?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  saved: boolean;
  liked: boolean;
}

interface Comment {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
}

const Index = () => {
  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const { toast } = useToast();

  // Update mocks to include photos and mini-maps
  const mockTrips = [
    {
      user: {
        name: "Shreyas Athreya",
        username: "shreyasathreya",
        avatar: undefined,
      },
      trip: {
        title: "Colombia — Solo Travel",
        duration: "25 hours",
        distance: "1000km",
        stops: [
          { name: "Medellín", lat: 6.2442, lng: -75.5812 },
          { name: "Bogotá", lat: 4.7110, lng: -74.0721 },
        ],
        photoCount: 12,
      },
      stats: {
        likes: 24,
        comments: 3,
      },
      photoUrls: ["url1", "url2"],
      map: "mock map",
    },
    {
      user: {
        name: "Ayur Palle",
        username: "ayurpalle",
        avatar: undefined,
      },
      trip: {
        title: "Portugal — Summer and 3 others",
        duration: "3 hours",
        distance: "215 km",
        stops: [
          { name: "Porto", lat: 41.1579, lng: -8.6291 },
          { name: "Évora", lat: 38.5714, lng: -7.9036 },
          { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
        ],
        photoCount: 18,
      },
      stats: {
        likes: 42,
        comments: 7,
      },
      photoUrls: ["url3", "url4"],
      map: "mock map 2",
    },
  ];

  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      user: {
        name: "Sarah Johnson",
        username: "sarah_j",
        avatar: ""
      },
      content: "Just completed an incredible 2-week journey through Japan! From the bustling streets of Tokyo to the serene temples of Kyoto. Every moment was magical ✨",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      likes_count: 24,
      comments_count: 8,
      saved: false,
      liked: false
    },
    {
      id: "2",
      user: {
        name: "Mike Chen",
        username: "mike_c",
        avatar: ""
      },
      content: "Amazing road trip through the Swiss Alps! The views were absolutely breathtaking 🏔️",
      created_at: new Date(Date.now() - 14400000).toISOString(),
      likes_count: 15,
      comments_count: 3,
      saved: false,
      liked: false
    }
  ]);

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            liked: !post.liked,
            likes_count: post.liked ? post.likes_count - 1 : post.likes_count + 1
          }
        : post
    ));
  };

  const handleSave = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, saved: !post.saved }
        : post
    ));
    
    const post = posts.find(p => p.id === postId);
    toast({
      title: post?.saved ? "Trip removed from saved" : "Trip saved",
      description: post?.saved ? "Removed from your saved trips" : "Added to your saved trips",
    });
  };

  const handleShare = (postId: string) => {
    toast({
      title: "Share trip",
      description: "Trip link copied to clipboard",
    });
  };

  const handleComment = (postId: string) => {
    setShowComments(postId);
    // Mock comments
    setComments([
      {
        id: "1",
        user: { name: "Alex Smith", username: "alex_s", avatar: "" },
        content: "Looks amazing! How was the food?",
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "2", 
        user: { name: "Emma Wilson", username: "emma_w", avatar: "" },
        content: "I'm planning a similar trip next year, any recommendations?",
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ]);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      user: { name: "You", username: "you", avatar: "" },
      content: newComment,
      created_at: new Date().toISOString()
    };
    
    setComments(prev => [...prev, comment]);
    setNewComment("");
    
    // Update comments count
    if (showComments) {
      setPosts(prev => prev.map(post => 
        post.id === showComments 
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      ));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Trip Cards */}
          {mockTrips.map((trip, index) => (
            <TripCard key={index} user={trip.user} trip={trip.trip} stats={trip.stats} />
          ))}

          {/* Posts */}
          {posts.map((post) => (
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
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm mb-4">{post.content}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`flex items-center gap-2 h-8 px-2 ${post.liked ? 'text-red-500' : ''}`}
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart size={16} className={post.liked ? 'fill-current' : ''} />
                      <span className="text-sm">{post.likes_count}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-2 h-8 px-2"
                      onClick={() => handleComment(post.id)}
                    >
                      <MessageCircle size={16} />
                      <span className="text-sm">{post.comments_count}</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleShare(post.id)}
                    >
                      <Send size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 ${post.saved ? 'text-primary' : ''}`}
                      onClick={() => handleSave(post.id)}
                    >
                      <Bookmark size={16} className={post.saved ? 'fill-current' : ''} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Comments Dialog */}
      <Dialog open={!!showComments} onOpenChange={() => setShowComments(null)}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.user.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {comment.user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send size={16} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <BottomTabBar />
    </div>
  );
};

export default Index;
