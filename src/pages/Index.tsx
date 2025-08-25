import { useState, useEffect } from 'react';
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Post {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  profiles?: {
    name: string;
    username: string;
    avatar: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
    username: string;
    avatar: string;
  };
}

const Index = () => {
  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Mock trips data (keeping this as is since it's not part of the posts system)
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

  // Load posts on component mount
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      // Fetch posts first
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading posts:', postsError);
        return;
      }

      if (!postsData || postsData.length === 0) {
        // Create some sample posts if none exist
        await createSamplePosts();
        return;
      }

      // Fetch profiles for all post authors
      const userIds = postsData.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, username, avatar')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Check likes and saves for current user
      if (user) {
        const postIds = postsData.map(p => p.id);
        
        const [likesResult, savesResult] = await Promise.all([
          supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)
        ]);

        const likedPosts = new Set(likesResult.data?.map(l => l.post_id) || []);
        const savedPosts = new Set(savesResult.data?.map(s => s.post_id) || []);

        const enrichedPosts = postsData.map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id),
          is_liked: likedPosts.has(post.id),
          is_saved: savedPosts.has(post.id)
        }));

        setPosts(enrichedPosts);
      } else {
        const enrichedPosts = postsData.map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id)
        }));
        setPosts(enrichedPosts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSamplePosts = async () => {
    if (!user) return;

    const samplePosts = [
      {
        user_id: user.id,
        content: "Just completed an incredible 2-week journey through Japan! From the bustling streets of Tokyo to the serene temples of Kyoto. Every moment was magical ✨"
      },
      {
        user_id: user.id,
        content: "Amazing road trip through the Swiss Alps! The views were absolutely breathtaking 🏔️"
      }
    ];

    try {
      const { error } = await supabase
        .from('posts')
        .insert(samplePosts);

      if (error) {
        console.error('Error creating sample posts:', error);
      } else {
        // Reload posts after creating samples
        loadPosts();
      }
    } catch (error) {
      console.error('Error creating sample posts:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.is_liked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId });
      }

      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
            }
          : p
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.is_saved) {
        // Unsave
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        toast({
          title: "Trip removed from saved",
          description: "Removed from your saved trips",
        });
      } else {
        // Save
        await supabase
          .from('saved_posts')
          .insert({ user_id: user.id, post_id: postId });
        
        toast({
          title: "Trip saved",
          description: "Added to your saved trips",
        });
      }

      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_saved: !p.is_saved }
          : p
      ));
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: "Error",
        description: "Failed to update save status",
        variant: "destructive",
      });
    }
  };

  const handleShare = (postId: string) => {
    toast({
      title: "Share trip",
      description: "Trip link copied to clipboard",
    });
  };

  const handleComment = async (postId: string) => {
    setShowComments(postId);
    
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }

      if (commentsData && commentsData.length > 0) {
        // Fetch profiles for comment authors
        const userIds = commentsData.map(c => c.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, username, avatar')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

        const enrichedComments = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id)
        }));

        setComments(enrichedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !showComments || !user) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: showComments,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Error",
          description: "Failed to add comment",
          variant: "destructive",
        });
        return;
      }

      // Reload comments
      handleComment(showComments);
      
      // Update comments count in posts
      setPosts(prev => prev.map(post => 
        post.id === showComments 
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      ));

      setNewComment("");
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

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
                    <AvatarImage src={post.profiles?.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {post.profiles?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{post.profiles?.name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">@{post.profiles?.username || 'unknown'}</p>
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
                      className={`flex items-center gap-2 h-8 px-2 ${post.is_liked ? 'text-red-500' : ''}`}
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart size={16} className={post.is_liked ? 'fill-current' : ''} />
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
                      className={`h-8 w-8 p-0 ${post.is_saved ? 'text-primary' : ''}`}
                      onClick={() => handleSave(post.id)}
                    >
                      <Bookmark size={16} className={post.is_saved ? 'fill-current' : ''} />
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
                    <AvatarImage src={comment.profiles?.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {comment.profiles?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.profiles?.name || 'Unknown User'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
                </div>
              )}
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
