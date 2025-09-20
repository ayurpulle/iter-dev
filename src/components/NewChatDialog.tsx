import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, MessageCircle, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useFriends, Friend } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ClickableUserInfo from '@/components/ClickableUserInfo';

interface NewChatDialogProps {
  onConversationCreated: (conversationId: string) => void;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({ onConversationCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [activeTab, setActiveTab] = useState('message');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { friends } = useFriends();
  const { toast } = useToast();

  const filteredFriends = friends.filter(friend =>
    friend.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOtherUserId = (friend: Friend) => {
    return friend.user_id === user?.id ? friend.friend_id : friend.user_id;
  };

  const handleFriendToggle = (friend: Friend) => {
    const friendUserId = getOtherUserId(friend);
    setSelectedFriends(prev => {
      if (prev.includes(friendUserId)) {
        return prev.filter(id => id !== friendUserId);
      } else if (prev.length < 5) { // Max 5 friends + current user = 6 total
        return [...prev, friendUserId];
      } else {
        toast({
          title: "Group limit reached",
          description: "Group chats can have a maximum of 6 people",
          variant: "destructive"
        });
        return prev;
      }
    });
  };

  const createDirectMessage = async (friend: Friend) => {
    if (!user) return;
    
    const friendUserId = getOtherUserId(friend);

    setLoading(true);
    try {
      // Check if conversation already exists
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id, friendUserId])
        .eq('is_group_chat', false);

      if (existingConversations && existingConversations.length > 0) {
        // Conversation exists, just navigate to it
        onConversationCreated(existingConversations[0].id);
        setIsOpen(false);
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          participants: [user.id, friendUserId],
          is_group_chat: false,
          created_by: user.id,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      onConversationCreated(newConversation.id);
      setIsOpen(false);
      
      toast({
        title: "Success",
        description: "Direct message created!"
      });
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to create conversation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroupChat = async () => {
    if (!user || selectedFriends.length < 2) {
      toast({
        title: "Invalid selection",
        description: "Please select at least 2 friends for a group chat",
        variant: "destructive"
      });
      return;
    }

    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for the group chat",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const participants = [user.id, ...selectedFriends];
      
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          participants,
          is_group_chat: true,
          group_name: groupName.trim(),
          created_by: user.id,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      onConversationCreated(newConversation.id);
      setIsOpen(false);
      setSelectedFriends([]);
      setGroupName('');
      
      toast({
        title: "Success",
        description: "Group chat created!"
      });
    } catch (error: any) {
      console.error('Error creating group chat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create group chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSearchTerm('');
    setSelectedFriends([]);
    setGroupName('');
    setActiveTab('message');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="message" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Message Friend
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-2">
              <Users className="h-4 w-4" />
              Group Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="message" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredFriends.length === 0 ? (
                <Card className="p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    {searchTerm ? 'No friends found matching your search' : 'No friends yet'}
                  </p>
                </Card>
              ) : (
                filteredFriends.map((friend) => (
                  <Card 
                    key={friend.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => createDirectMessage(friend)}
                  >
                    <div className="flex items-center gap-3">
                      <ClickableUserInfo
                        username={friend.profile?.username}
                        name={friend.profile?.name}
                        avatar={friend.profile?.avatar}
                        userId={friend.user_id || friend.friend_id}
                        className="flex items-center gap-3 flex-1"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.profile?.avatar || ''} />
                          <AvatarFallback>
                            {friend.profile?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{friend.profile?.name || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground">@{friend.profile?.username || 'unknown'}</p>
                        </div>
                      </ClickableUserInfo>
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <Input
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends to add..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedFriends.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Selected ({selectedFriends.length}/5):</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFriends.map(friendId => {
                    const friend = friends.find(f => getOtherUserId(f) === friendId);
                    return friend ? (
                      <Badge key={friendId} variant="secondary" className="gap-2">
                        {friend.profile?.name || 'Unknown'}
                        <button
                          onClick={() => handleFriendToggle(friend)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredFriends.length === 0 ? (
                <Card className="p-4 text-center">
                  <p className="text-muted-foreground text-sm">No friends available</p>
                </Card>
              ) : (
                filteredFriends.map((friend) => (
                  <Card 
                    key={friend.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedFriends.includes(getOtherUserId(friend)) 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleFriendToggle(friend)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.profile?.avatar || ''} />
                        <AvatarFallback>
                          {friend.profile?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{friend.profile?.name || 'Unknown'}</h3>
                        <p className="text-xs text-muted-foreground">@{friend.profile?.username || 'unknown'}</p>
                      </div>
                      {selectedFriends.includes(getOtherUserId(friend)) && (
                        <Badge variant="secondary" className="h-6 w-6 rounded-full p-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            <Button 
              onClick={createGroupChat}
              disabled={loading || selectedFriends.length < 2 || !groupName.trim()}
              className="w-full"
            >
              {loading ? 'Creating...' : `Create Group (${selectedFriends.length + 1}/6)`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};