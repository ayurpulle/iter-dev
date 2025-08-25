import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Users, Heart, MessageCircle as MessageIcon, MoreHorizontal, ImageIcon, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar: string;
  };
}

interface Conversation {
  id: string;
  other_user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  last_message: string;
  last_message_time: string;
  unread_count: number;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
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
      if (selectedConversation) {
        fetchMessages(selectedConversation);
      } else {
        fetchConversations();
      }
    } else {
      fetchPosts();
    }
  }, [user, activeTab, selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Mock data for conversations
      const mockConversations: Conversation[] = [
        {
          id: "conv1",
          other_user: {
            id: "user1",
            name: "Sarah Johnson",
            username: "sarah_j",
            avatar: ""
          },
          last_message: "Thanks for the travel tips!",
          last_message_time: new Date(Date.now() - 3600000).toISOString(),
          unread_count: 2
        },
        {
          id: "conv2",
          other_user: {
            id: "user2",
            name: "Mike Chen",
            username: "mike_c",
            avatar: ""
          },
          last_message: "Let's plan a trip together soon",
          last_message_time: new Date(Date.now() - 7200000).toISOString(),
          unread_count: 0
        }
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      // Mock messages for specific conversation
      const mockMessages: ChatMessage[] = [
        {
          id: "1",
          user_id: "user1",
          content: "Hey! How was your trip to Japan?",
          created_at: new Date(Date.now() - 7200000).toISOString(),
          profiles: {
            name: "Sarah Johnson",
            username: "sarah_j",
            avatar: ""
          }
        },
        {
          id: "2",
          user_id: user.id,
          content: "It was amazing! The cherry blossoms were incredible",
          created_at: new Date(Date.now() - 5400000).toISOString(),
          profiles: {
            name: "You",
            username: "you",
            avatar: ""
          }
        },
        {
          id: "3",
          user_id: "user1",
          content: "Thanks for the travel tips!",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          profiles: {
            name: "Sarah Johnson",
            username: "sarah_j",
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
    if (!newMessage.trim() || !user || !selectedConversation) return;

    try {
      const mockMessage: ChatMessage = {
        id: Date.now().toString(),
        user_id: user.id,
        content: newMessage,
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
        description: "Your message has been sent.",
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
            {selectedConversation ? (
              <div className="flex flex-col h-[calc(100vh-200px)]">
                {/* Chat Header */}
                <div className="border-b border-border p-4 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={conversations.find(c => c.id === selectedConversation)?.other_user.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {(conversations.find(c => c.id === selectedConversation)?.other_user.name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{conversations.find(c => c.id === selectedConversation)?.other_user.name}</p>
                    <p className="text-xs text-muted-foreground">@{conversations.find(c => c.id === selectedConversation)?.other_user.username}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={message.profiles.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {(message.profiles.name || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 min-w-0 ${message.user_id === user?.id ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{message.profiles.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className={`inline-block p-3 rounded-lg ${
                          message.user_id === user?.id 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
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
            ) : (
              <div className="px-4 py-6 max-w-md mx-auto">
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <Card 
                      key={conversation.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedConversation(conversation.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={conversation.other_user.avatar} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {conversation.other_user.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{conversation.other_user.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate">{conversation.last_message}</p>
                              {conversation.unread_count > 0 && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {conversations.length === 0 && (
                    <div className="text-center py-12">
                      <MessageIcon size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                      <p className="text-muted-foreground">
                        Start chatting with other travelers!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                             <ImageIcon size={16} className="mr-1" />
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