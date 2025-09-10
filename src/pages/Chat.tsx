import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Users, Heart, MessageCircle as MessageIcon, MoreHorizontal, ImageIcon, MapPin, Search } from "lucide-react";
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
import { useLocation } from "react-router-dom";
import SharedPostCard from "@/components/SharedPostCard";
import { SharedItineraryCard } from "@/components/SharedItineraryCard";
import { CollaborationItineraryCard } from "@/components/CollaborationItineraryCard";
import { ConversationActions } from "@/components/ConversationActions";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  metadata?: {
    type: string;
    post_id?: string;
    itinerary_id?: string;
    itinerary_title?: string;
  };
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    if (selectedConversation) {
      fetchMessages(selectedConversation);
      markMessagesAsRead(selectedConversation);
      
    } else {
      fetchConversations();
    }

    // Set up real-time subscription for conversations and messages
    const channel = supabase
      .channel('conversations-and-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          if (!selectedConversation) {
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          if (selectedConversation) {
            fetchMessages(selectedConversation);
          }
          if (!selectedConversation) {
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  // Handle conversation from profile page
  useEffect(() => {
    const state = location.state as { conversationId?: string };
    if (state?.conversationId) {
      setSelectedConversation(state.conversationId);
    }
  }, [location.state]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    if (!user) return;
    console.log('Fetching conversations for user:', user.id);

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participants,
          last_message,
          last_message_at
        `)
        .contains('participants', [user.id])
        .order('last_message_at', { ascending: false });

      console.log('Raw conversations:', conversations);

      // Get profile data for other participants
      const conversationsWithProfiles = await Promise.all(
        (conversations || []).map(async (conv) => {
          const otherUserId = conv.participants.find((id: string) => id !== user.id);
          
          if (!otherUserId) {
            console.log('No other user found for conversation:', conv.id);
            return null;
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, name, username, avatar')
            .eq('user_id', otherUserId)
            .single();

          if (profileError) {
            console.log('Profile fetch error:', profileError);
          }

          // Count unread messages for this conversation
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...conv,
            other_user: profile ? {
              id: profile.user_id,
              name: profile.name || 'Unknown User',
              username: profile.username || 'unknown',
              avatar: profile.avatar || ''
            } : {
              id: otherUserId,
              name: 'Unknown User',
              username: 'unknown',
              avatar: ''
            },
            unread_count: unreadCount || 0
          };
        })
      );

      // Filter out null conversations
      const validConversations = conversationsWithProfiles.filter(conv => conv !== null);

      console.log('Valid conversations:', validConversations);

      setConversations(validConversations.map(conv => ({
        id: conv.id,
        other_user: conv.other_user,
        last_message: conv.last_message || '',
        last_message_time: conv.last_message_at || '',
        unread_count: conv.unread_count || 0
      })));
      console.log('Set conversations state with count:', validConversations.length);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!user) return;
    console.log('Fetching messages for conversation:', conversationId);

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          metadata,
          read_at
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Get profile data separately for each unique sender
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, username, avatar')
        .in('user_id', senderIds);

      // Create a map of profiles by user_id
      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      console.log('Raw messages:', messages);
      
      const formattedMessages = (messages || []).map(msg => {
        const profile = profileMap[msg.sender_id];
        return {
          id: msg.id,
          user_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          metadata: msg.metadata as any,
          profiles: profile || {
            name: 'Unknown User',
            username: 'unknown',
            avatar: ''
          }
        };
      });
      
      console.log('Formatted messages:', formattedMessages);
      setMessages(formattedMessages as ChatMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      console.log('Marking messages as read for conversation:', conversationId);
      
      // Mark all unread messages in this conversation as read
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      console.log('Successfully marked messages as read');
      
      // Refresh conversations to update unread counts
      setTimeout(() => {
        fetchConversations();
      }, 100);
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };


  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation);

      setNewMessage("");
      fetchMessages(selectedConversation);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendSharedPost = async (postId: string) => {
    if (!user || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: `📸 Shared a post with you`,
          metadata: {
            type: 'shared_post',
            post_id: postId
          }
        });

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: `📸 Shared a post with you`,
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation);

      fetchMessages(selectedConversation);
      toast({
        title: "Post shared!",
        description: "Your post has been shared to the conversation.",
      });
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: "Error",
        description: "Failed to share post. Please try again.",
        variant: "destructive",
      });
    }
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (selectedConversation) {
    const currentConv = conversations.find(c => c.id === selectedConversation);
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedConversation(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentConv?.other_user?.avatar || ''} />
            <AvatarFallback>
              {currentConv?.other_user?.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-medium">{currentConv?.other_user?.name || 'Unknown User'}</h2>
            <p className="text-xs text-muted-foreground">
              @{currentConv?.other_user?.username || 'username'}
            </p>
          </div>
          <ConversationActions 
            conversationId={selectedConversation}
            onConversationDeleted={() => {
              setSelectedConversation(null);
              fetchConversations();
            }}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              {(() => {
                console.log('Rendering message:', message.id, 'metadata:', message.metadata);
                if (message.metadata?.type === 'shared_post' && message.metadata.post_id) {
                  console.log('Rendering SharedPostCard for post:', message.metadata.post_id);
                  return (
                    <div className="max-w-xs w-full">
                      <SharedPostCard postId={message.metadata.post_id} />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  );
                } else if (message.metadata?.type === 'shared_itinerary' && message.metadata.itinerary_id) {
                  console.log('Rendering SharedItineraryCard for itinerary:', message.metadata.itinerary_id);
                  return (
                    <div className="max-w-xs w-full">
                      <SharedItineraryCard 
                        itineraryId={message.metadata.itinerary_id}
                        itineraryTitle={message.metadata.itinerary_title || 'Shared Itinerary'}
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  );
                } else if (message.metadata?.type === 'collaboration_invite' && message.metadata.itinerary_id) {
                  console.log('Rendering CollaborationItineraryCard for itinerary:', message.metadata.itinerary_id);
                  return (
                    <div className="max-w-xs w-full">
                      <CollaborationItineraryCard 
                        itineraryId={message.metadata.itinerary_id}
                        itineraryTitle={message.metadata.itinerary_title || 'Collaboration Invite'}
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  );
                } else {
                  console.log('Rendering regular message');
                  return (
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        message.user_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conversations List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="font-medium mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start a conversation by visiting someone's profile and clicking the message button
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/global-search'}
              >
                Find People to Message
              </Button>
            </Card>
          ) : (
            filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.other_user?.avatar || ''} />
                    <AvatarFallback>
                      {conversation.other_user?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">
                        {conversation.other_user?.name || 'Unknown User'}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.last_message_time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message || 'No messages yet'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Chat;