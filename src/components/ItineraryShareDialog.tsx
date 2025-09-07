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
import { Share2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useItineraryCollaboration } from '@/hooks/useItineraryCollaboration';
import { useFriends } from '@/hooks/useFriends';

interface ItineraryShareDialogProps {
  itineraryId: string;
  itineraryTitle: string;
}

export const ItineraryShareDialog = ({ itineraryId, itineraryTitle }: ItineraryShareDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { shareItinerary, loading } = useItineraryCollaboration();
  const { friends } = useFriends();

  useEffect(() => {
    // Friends are already fetched by the useFriends hook
  }, [isOpen]);

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) return;
    
    const success = await shareItinerary(itineraryId, selectedFriends);
    if (success) {
      setSelectedFriends([]);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Itinerary</DialogTitle>
          <DialogDescription>
            Share "{itineraryTitle}" with your friends
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No friends to share with
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {friends.map((friend) => {
                const friendProfile = friend.profile;
                const friendId = friend.user_id === friend.friend_id ? friend.friend_id : friend.user_id;
                
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
              disabled={selectedFriends.length === 0 || loading}
            >
              {loading ? 'Sharing...' : `Share with ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};