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
import SharedPostCard from "@/components/SharedPostCard";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  metadata?: {
    type: string;
    post_id?: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    if (selectedConversation) {
      fetchMessages(selectedConversation);
    } else {
      fetchConversations();
    }
  }, [user, selectedConversation]);

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
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, name, username, avatar')
            .eq('user_id', otherUserId)
            .single();

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
            }
          };
        })
      );

      console.log('Formatted conversations:', conversationsWithProfiles);

      setConversations(conversationsWithProfiles.map(conv => ({
        id: conv.id,
        other_user: conv.other_user,
        last_message: conv.last_message || '',
        last_message_time: conv.last_message_at || '',
        unread_count: 0 // TODO: Calculate actual unread count
      })));
      console.log('Set conversations state');
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
          read_at,
          profiles!messages_sender_id_fkey (
            name,
            username,
            avatar
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      console.log('Raw messages:', messages);
      
      const formattedMessages = (messages || []).map(msg => ({
        id: msg.id,
        user_id: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        metadata: msg.metadata as any,
        profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
      }));
      
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
      // Mark all unread messages in this conversation as read (except own messages)
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
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
        <div className="bg-background border-b border-border px-4 py-3">
          <h1 className="text-lg font-semibold text-center max-w-md mx-auto">Messages</h1>
        </div>

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
                     {message.metadata?.type === 'shared_post' && message.metadata.post_id ? (
                       <SharedPostCard postId={message.metadata.post_id} className="max-w-sm" />
                     ) : (
                       <div className={`inline-block p-3 rounded-lg ${
                         message.user_id === user?.id 
                           ? 'bg-primary text-primary-foreground ml-auto' 
                           : 'bg-muted'
                       }`}>
                         <p className="text-sm">{message.content}</p>
                       </div>
                     )}
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
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Chat;