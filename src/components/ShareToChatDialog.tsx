import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Share2, Send, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useShareToChat } from '@/hooks/useShareToChat';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ShareToChatDialogProps {
  itemType: 'itinerary' | 'post';
  itemId: string;
  itemTitle: string;
  content?: string;
  triggerText?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

interface Conversation {
  id: string;
  type: 'friend' | 'group';
  name: string;
  avatar?: string;
  user_id?: string; // for friend conversations
}

export const ShareToChatDialog = ({ 
  itemType, 
  itemId, 
  itemTitle, 
  content,
  triggerText = "Send",
  variant = "outline",
  size = "sm"
}: ShareToChatDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { shareToChat, loading } = useShareToChat();
  const { friends } = useFriends();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get group chats
      const { data: groupChats, error: groupError } = await supabase
        .from('conversations')
        .select('id, group_name, is_group_chat')
        .contains('participants', [user.id])
        .eq('is_group_chat', true);

      if (groupError) throw groupError;

      // Create conversation list from friends and group chats
      const conversationList: Conversation[] = [];

      // Add friends as individual conversations
      friends.forEach(friend => {
        const friendProfile = friend.profile;
        const friendId = friend.user_id === user.id ? friend.friend_id : friend.user_id;
        
        conversationList.push({
          id: friendId,
          type: 'friend',
          name: friendProfile?.name || friendProfile?.username || 'Unknown',
          avatar: friendProfile?.avatar,
          user_id: friendId
        });
      });

      // Add group chats
      (groupChats || []).forEach(group => {
        conversationList.push({
          id: group.id,
          type: 'group',
          name: group.group_name || 'Group Chat'
        });
      });

      setConversations(conversationList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedTarget) return;
    
    const target = conversations.find(conv => 
      conv.type === 'friend' ? conv.user_id === selectedTarget : conv.id === selectedTarget
    );
    
    if (!target) return;

    let success = false;
    if (target.type === 'friend' && target.user_id) {
      success = await shareToChat(target.user_id, itemType, itemId, itemTitle, content);
    } else if (target.type === 'group') {
      // For group chats, we need to send directly to the conversation
      success = await shareToGroupChat(target.id, itemType, itemId, itemTitle, content);
    }
    
    if (success) {
      setSelectedTarget('');
      setIsOpen(false);
    }
  };

  const shareToGroupChat = async (
    conversationId: string,
    itemType: 'itinerary' | 'post',
    itemId: string,
    itemTitle: string,
    content?: string
  ) => {
    if (!user) return false;

    try {
      let shareMessage = '';
      let messageData = null;
      
      if (itemType === 'itinerary') {
        shareMessage = `🗺️ I shared an itinerary with you: "${itemTitle}"`;
        messageData = { 
          type: 'shared_itinerary', 
          itinerary_id: itemId,
          itinerary_title: itemTitle 
        };
      } else {
        shareMessage = `📸 I shared a post with you`;
        messageData = { type: 'shared_post', post_id: itemId };
      }

      // Send the message to the group chat
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: shareMessage,
          metadata: messageData
        });

      if (messageError) throw messageError;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: shareMessage,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return true;
    } catch (error) {
      console.error('Error sharing to group chat:', error);
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="p-2">
          <Share2 className="h-5 w-5" />
          {triggerText && <span className="ml-2">{triggerText}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Chat</DialogTitle>
          <DialogDescription>
            Share "{itemTitle}" with a friend in your chat
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No conversations available
            </p>
          ) : (
            <RadioGroup 
              value={selectedTarget} 
              onValueChange={setSelectedTarget}
              className="max-h-60 overflow-y-auto space-y-2"
            >
              {conversations.map((conversation) => {
                const targetValue = conversation.type === 'friend' ? conversation.user_id! : conversation.id;
                
                return (
                  <div key={`${conversation.type}-${conversation.id}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <RadioGroupItem value={targetValue} id={targetValue} />
                    <Label htmlFor={targetValue} className="flex items-center space-x-3 flex-1 cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conversation.avatar || ''} />
                        <AvatarFallback>
                          {conversation.type === 'group' ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            conversation.name?.charAt(0) || '?'
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {conversation.name}
                        </p>
                        {conversation.type === 'group' && (
                          <p className="text-xs text-muted-foreground">Group Chat</p>
                        )}
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleShare} 
              disabled={!selectedTarget || loading}
            >
              {loading ? 'Sending...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};