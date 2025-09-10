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
import { Share2, Users, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useItineraryCollaboration } from '@/hooks/useItineraryCollaboration';
import { useFriends } from '@/hooks/useFriends';
import { ShareToChatDialog } from './ShareToChatDialog';

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
    <ShareToChatDialog
      itemType="itinerary"
      itemId={itineraryId}
      itemTitle={itineraryTitle}
      triggerText=""
      variant="ghost"
      size="sm"
    />
  );
};