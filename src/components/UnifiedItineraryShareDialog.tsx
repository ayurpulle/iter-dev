import { useState } from 'react';
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
import { Send, Eye, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useItineraryCollaboration } from '@/hooks/useItineraryCollaboration';
import { useFriends } from '@/hooks/useFriends';
import { useShareToChat } from '@/hooks/useShareToChat';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UnifiedItineraryShareDialogProps {
  itineraryId: string;
  itineraryTitle: string;
  triggerButton?: React.ReactNode;
}

export const UnifiedItineraryShareDialog = ({ 
  itineraryId, 
  itineraryTitle, 
  triggerButton 
}: UnifiedItineraryShareDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [shareType, setShareType] = useState<'share' | 'collaborate'>('share');
  
  const { shareItinerary, loading: collaborationLoading } = useItineraryCollaboration();
  const { shareToChat, loading: shareLoading } = useShareToChat();
  const { friends } = useFriends();
  const { user } = useAuth();

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) return;
    
    if (shareType === 'share') {
      // Send via chat for view-only access
      for (const friendId of selectedFriends) {
        await shareToChat(
          friendId, 
          'itinerary', 
          itineraryId, 
          itineraryTitle,
          'Check out this itinerary!'
        );
      }
    } else {
      // Send collaboration invites
      const success = await shareItinerary(itineraryId, selectedFriends, itineraryTitle);
      if (!success) return;
    }
    
    setSelectedFriends([]);
    setIsOpen(false);
  };

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
              {friends.map((friend) => {
                const friendProfile = friend.profile;
                // Get the correct friend ID - determine which user is NOT the current user
                const friendId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;
                
                return (
                  <div key={friend.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      checked={selectedFriends.includes(friendId)}
                      onCheckedChange={() => handleFriendToggle(friendId)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friendProfile?.avatar || ''} />
                      <AvatarFallback>
                        {friendProfile?.name?.charAt(0) || friendProfile?.username?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {friendProfile?.name || friendProfile?.username || 'Unknown'}
                      </p>
                      {friendProfile?.username && friendProfile?.name && (
                        <p className="text-xs text-muted-foreground">@{friendProfile.username}</p>
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
              disabled={selectedFriends.length === 0 || collaborationLoading || shareLoading}
            >
              {(collaborationLoading || shareLoading) ? 'Sending...' : 
                shareType === 'share' ? 
                  `Share with ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}` :
                  `Invite ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};