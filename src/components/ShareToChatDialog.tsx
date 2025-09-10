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
import { Share2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useShareToChat } from '@/hooks/useShareToChat';
import { useFriends } from '@/hooks/useFriends';

interface ShareToChatDialogProps {
  itemType: 'itinerary' | 'post';
  itemId: string;
  itemTitle: string;
  content?: string;
  triggerText?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
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
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const { shareToChat, loading } = useShareToChat();
  const { friends } = useFriends();

  const handleShare = async () => {
    if (!selectedFriend) return;
    
    const success = await shareToChat(selectedFriend, itemType, itemId, itemTitle, content);
    if (success) {
      setSelectedFriend('');
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="h-8 w-8 p-0">
          <Share2 className="h-4 w-4" />
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
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No friends to share with
            </p>
          ) : (
            <RadioGroup 
              value={selectedFriend} 
              onValueChange={setSelectedFriend}
              className="max-h-60 overflow-y-auto space-y-2"
            >
              {friends.map((friend) => {
                const friendProfile = friend.profile;
                const friendId = friend.user_id === friend.friend_id ? friend.friend_id : friend.user_id;
                
                return (
                  <div key={friend.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <RadioGroupItem value={friendId} id={friendId} />
                    <Label htmlFor={friendId} className="flex items-center space-x-3 flex-1 cursor-pointer">
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
              disabled={!selectedFriend || loading}
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