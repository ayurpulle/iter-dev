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
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Eye, Edit, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useItineraryCollaboration } from '@/hooks/useItineraryCollaboration';
import { useFriends } from '@/hooks/useFriends';
import { useShareToChat } from '@/hooks/useShareToChat';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedItineraryShareDialogProps {
  itineraryId: string;
  itineraryTitle: string;
  triggerButton?: React.ReactNode;
  isOwner?: boolean; // Add isOwner prop to control access
}

interface ShareTarget {
  id: string;
  type: 'friend' | 'group';
  name: string;
  avatar?: string;
  user_id?: string; // for friend conversations
}

export const UnifiedItineraryShareDialog = ({ 
  itineraryId, 
  itineraryTitle, 
  triggerButton,
  isOwner = false
}: UnifiedItineraryShareDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [shareType, setShareType] = useState<'share' | 'collaborate'>('share');
  const [shareTargets, setShareTargets] = useState<ShareTarget[]>([]);
  
  const { shareItinerary, loading: collaborationLoading } = useItineraryCollaboration();
  const { shareToChat, loading: shareLoading } = useShareToChat();
  const { friends } = useFriends();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchShareTargets();
    }
  }, [isOpen, user, friends]);

  const fetchShareTargets = async () => {
    if (!user) return;

    try {
      // Get group chats
      const { data: groupChats, error: groupError } = await supabase
        .from('conversations')
        .select('id, group_name, is_group_chat')
        .contains('participants', [user.id])
        .eq('is_group_chat', true);

      if (groupError) throw groupError;

      // Create target list from friends and group chats
      const targetList: ShareTarget[] = [];

      // Add friends as individual targets
      friends.forEach(friend => {
        const friendProfile = friend.profile;
        const friendId = friend.user_id === user.id ? friend.friend_id : friend.user_id;
        
        targetList.push({
          id: friendId,
          type: 'friend',
          name: friendProfile?.name || friendProfile?.username || 'Unknown',
          avatar: friendProfile?.avatar,
          user_id: friendId
        });
      });

      // Add group chats
      (groupChats || []).forEach(group => {
        targetList.push({
          id: group.id,
          type: 'group',
          name: group.group_name || 'Group Chat'
        });
      });

      setShareTargets(targetList);
    } catch (error) {
      console.error('Error fetching share targets:', error);
    }
  };

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargets(prev => 
      prev.includes(targetId) 
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const shareToGroupChat = async (conversationId: string) => {
    if (!user) return false;

    try {
      const shareMessage = shareType === 'collaborate' 
        ? `🤝 I invited you to collaborate on: "${itineraryTitle}"`
        : `🗺️ I shared an itinerary with you: "${itineraryTitle}"`;
        
      const messageData = { 
        type: shareType === 'collaborate' ? 'collaboration_invite' : 'shared_itinerary', 
        itinerary_id: itineraryId,
        itinerary_title: itineraryTitle 
      };

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

  const handleShare = async () => {
    if (selectedTargets.length === 0) return;
    
    const friendTargets = selectedTargets.filter(targetId => {
      const target = shareTargets.find(t => (t.type === 'friend' ? t.user_id : t.id) === targetId);
      return target?.type === 'friend';
    });
    
    const groupTargets = selectedTargets.filter(targetId => {
      const target = shareTargets.find(t => (t.type === 'friend' ? t.user_id : t.id) === targetId);
      return target?.type === 'group';
    });
    
    if (shareType === 'share') {
      // Send via chat for view-only access
      for (const targetId of friendTargets) {
        await shareToChat(
          targetId, 
          'itinerary', 
          itineraryId, 
          itineraryTitle,
          'Check out this itinerary!'
        );
      }
      
      // Send to group chats
      for (const targetId of groupTargets) {
        await shareToGroupChat(targetId);
      }
    } else {
      // Send collaboration invites - only owners can give edit permission
      const permission = isOwner ? 'edit' : 'view'; 
      
      if (friendTargets.length > 0) {
        const success = await shareItinerary(itineraryId, friendTargets, itineraryTitle, permission);
        if (!success) return;
      }
      
      // For group chats in collaboration mode, still send to chat with collaboration message
      for (const targetId of groupTargets) {
        await shareToGroupChat(targetId);
      }
    }
    
    setSelectedTargets([]);
    setIsOpen(false);
  };

  // Show different message for non-owners
  if (!isOwner) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {triggerButton || (
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Itinerary</DialogTitle>
            <DialogDescription>
              Share "{itineraryTitle}" with your friends (view-only)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {shareTargets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No friends or groups to share with
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {shareTargets.map((target) => {
                  const targetId = target.type === 'friend' ? target.user_id! : target.id;
                  
                  return (
                    <div key={`${target.type}-${target.id}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                      <Checkbox
                        checked={selectedTargets.includes(targetId)}
                        onCheckedChange={() => handleTargetToggle(targetId)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={target.avatar || ''} />
                        <AvatarFallback>
                          {target.type === 'group' ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            target.name?.charAt(0) || '?'
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {target.name}
                        </p>
                        {target.type === 'group' && (
                          <p className="text-xs text-muted-foreground">Group Chat</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  // For non-owners, always share as view-only
                  if (selectedTargets.length > 0) {
                    selectedTargets.forEach(targetId => {
                      const target = shareTargets.find(t => (t.type === 'friend' ? t.user_id : t.id) === targetId);
                      if (target?.type === 'friend' && target.user_id) {
                        shareToChat(
                          target.user_id, 
                          'itinerary', 
                          itineraryId, 
                          itineraryTitle,
                          'Check out this itinerary!'
                        );
                      } else if (target?.type === 'group') {
                        shareToGroupChat(target.id);
                      }
                    });
                    setSelectedTargets([]);
                    setIsOpen(false);
                  }
                }} 
                disabled={selectedTargets.length === 0 || shareLoading}
              >
                {shareLoading ? 'Sharing...' : 
                  `Share with ${selectedTargets.length} ${selectedTargets.length !== 1 ? 'recipients' : 'recipient'}`
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Send className="h-4 w-4 mr-2" />
      Send
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Itinerary</DialogTitle>
          <DialogDescription>
            Share "{itineraryTitle}" with your friends
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={shareType} onValueChange={(value) => setShareType(value as 'share' | 'collaborate')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Share
            </TabsTrigger>
            <TabsTrigger value="collaborate" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Collaborate
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="share" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Friends can view and save the itinerary to their own collection
            </p>
          </TabsContent>
          
          <TabsContent value="collaborate" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Friends can edit the itinerary and changes will sync for everyone
            </p>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-4">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No friends to share with
            </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {shareTargets.map((target) => {
                  const targetId = target.type === 'friend' ? target.user_id! : target.id;
                  
                  return (
                    <div key={`${target.type}-${target.id}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                      <Checkbox
                        checked={selectedTargets.includes(targetId)}
                        onCheckedChange={() => handleTargetToggle(targetId)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={target.avatar || ''} />
                        <AvatarFallback>
                          {target.type === 'group' ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            target.name?.charAt(0) || '?'
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {target.name}
                        </p>
                        {target.type === 'group' && (
                          <p className="text-xs text-muted-foreground">Group Chat</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleShare} 
              disabled={selectedTargets.length === 0 || collaborationLoading || shareLoading}
            >
              {(collaborationLoading || shareLoading) ? 'Sending...' : 
                shareType === 'share' ? 
                  `Share with ${selectedTargets.length} ${selectedTargets.length !== 1 ? 'recipients' : 'recipient'}` :
                  `Invite ${selectedTargets.length} ${selectedTargets.length !== 1 ? 'recipients' : 'recipient'}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};