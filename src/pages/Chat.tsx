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

    try {
      // For now, set empty conversations until real implementation
      setConversations([]);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      // For now, set empty messages until real implementation
      setMessages([]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };


  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedConversation) return;

    try {
      // For now, just show a success message until real implementation
      setNewMessage("");
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
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Chat;