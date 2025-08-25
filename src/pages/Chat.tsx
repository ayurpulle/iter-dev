import { useState, useEffect, useRef } from "react";
import { Send, Image, MapPin, Users, Heart, MessageCircle as MessageIcon, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import TripCard from "@/components/TripCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  type: 'message' | 'post';
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar: string;
  };
  trip_data?: any;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  trip_id?: string;
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar: string;
  };
  trips?: any;
  likes_count: number;
  comments_count: number;
}

const Chat = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    if (activeTab === "chat") {
      fetchMessages();
      // Set up real-time subscription for messages
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
          },
          () => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      fetchPosts();
      // Set up real-time subscription for posts
      const channel = supabase
        .channel('social-posts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'social_posts'
          },
          () => {
            fetchPosts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!user) return;

    try {
      // Mock data for now - will be replaced with actual chat table
      const mockMessages: ChatMessage[] = [
        {
          id: "1",
          user_id: "user1",
          content: "Hey everyone! Just got back from an amazing trip to Japan 🇯🇵",
          type: "message",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          profiles: {
            name: "Sarah Johnson",
            username: "sarah_j",
            avatar: ""
          }
        },
        {
          id: "2", 
          user_id: "user2",
          content: "That sounds incredible! Would love to hear more about it",
          type: "message",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          profiles: {
            name: "Mike Chen",
            username: "mike_c",
            avatar: ""
          }
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!user) return;

    try {
      // Mock data for posts
      const mockPosts: Post[] = [
        {
          id: "1",
          user_id: "user1",
          content: "Just completed an incredible 2-week journey through Japan! From the bustling streets of Tokyo to the serene temples of Kyoto. Every moment was magical ✨",
          created_at: new Date(Date.now() - 7200000).toISOString(),
          profiles: {
            name: "Sarah Johnson",
            username: "sarah_j",
            avatar: ""
          },
          likes_count: 24,
          comments_count: 8
        }
      ];
      
      setPosts(mockPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      // Mock sending message
      const mockMessage: ChatMessage = {
        id: Date.now().toString(),
        user_id: user.id,
        content: newMessage,
        type: "message",
        created_at: new Date().toISOString(),
        profiles: {
          name: "You",
          username: "you",
          avatar: ""
        }
      };

      setMessages(prev => [...prev, mockMessage]);
      setNewMessage("");
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to the chat.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createPost = async () => {
    if (!newPost.trim() || !user) return;

    try {
      // Mock creating post
      const mockPost: Post = {
        id: Date.now().toString(),
        user_id: user.id,
        content: newPost,
        created_at: new Date().toISOString(),
        profiles: {
          name: "You",
          username: "you",
          avatar: ""
        },
        likes_count: 0,
        comments_count: 0
      };

      setPosts(prev => [mockPost, ...prev]);
      setNewPost("");
      
      toast({
        title: "Post created",
        description: "Your post has been shared with everyone.",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <main className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="flex-1 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-background border-b border-border px-4 py-3">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="mt-0">
            <div className="flex flex-col h-[calc(100vh-200px)]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.profiles.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {(message.profiles.name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.profiles.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-2 max-w-md mx-auto">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-0">
            <div className="px-4 py-6 max-w-md mx-auto">
              <div className="space-y-6">
                {/* Create Post */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Share your travel thoughts..."
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        rows={3}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <Image size={16} className="mr-1" />
                            Photo
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <MapPin size={16} className="mr-1" />
                            Location
                          </Button>
                        </div>
                        <Button size="sm" onClick={createPost} disabled={!newPost.trim()}>
                          Post
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Posts Feed */}
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={post.profiles.avatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {(post.profiles.name || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{post.profiles.name}</p>
                              <p className="text-xs text-muted-foreground">@{post.profiles.username}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{post.content}</p>
                      
                      <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
                            <Heart size={16} />
                            <span className="text-sm">{post.likes_count}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
                            <MessageIcon size={16} />
                            <span className="text-sm">{post.comments_count}</span>
                          </Button>
                        </div>
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {posts.length === 0 && (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to share your travel experiences!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Chat;