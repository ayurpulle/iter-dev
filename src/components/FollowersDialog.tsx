import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ClickableUserInfo from '@/components/ClickableUserInfo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';

interface FollowUser {
  user_id: string;
  name?: string;
  username?: string;
  avatar?: string;
  is_following?: boolean;
  friendship_status?: string;
}

interface FollowersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  count: number;
}

export const FollowersDialog = ({ isOpen, onClose, userId, type, count }: FollowersDialogProps) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { getFriendshipStatus, sendFriendRequest } = useFriends();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      loadUsers();
    }
  }, [isOpen, userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query;
      
      if (type === 'followers') {
        // Get users who follow this user
        query = supabase
          .from('friends')
          .select(`
            user_id,
            profiles!friends_user_id_fkey (
              user_id,
              name,
              username,
              avatar
            )
          `)
          .eq('friend_id', userId)
          .eq('status', 'accepted');
      } else {
        // Get users this user follows
        query = supabase
          .from('friends')
          .select(`
            friend_id,
            profiles!friends_friend_id_fkey (
              user_id,
              name,
              username,
              avatar
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'accepted');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      // Transform data and check friendship status for current user
      const transformedUsers = await Promise.all(
        (data || []).map(async (item: any) => {
          const profile = item.profiles;
          const targetUserId = type === 'followers' ? item.user_id : item.friend_id;
          
          if (!profile) return null;

          let friendshipStatus = null;
          if (user && user.id !== targetUserId) {
            try {
              friendshipStatus = await getFriendshipStatus(targetUserId);
            } catch (error) {
              console.error('Error getting friendship status:', error);
            }
          }

          return {
            user_id: targetUserId,
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar,
            friendship_status: friendshipStatus?.mutualStatus,
            is_following: friendshipStatus?.mutualStatus === 'accepted'
          };
        })
      );

      setUsers(transformedUsers.filter(Boolean) as FollowUser[]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUser = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      await sendFriendRequest(targetUserId);
      toast({
        title: "Follow request sent",
        description: "Your follow request has been sent",
      });
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === targetUserId 
          ? { ...u, friendship_status: 'pending' }
          : u
      ));
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast({
        title: "Error",
        description: "Failed to send follow request",
        variant: "destructive",
      });
    }
  };

  const renderActionButton = (targetUser: FollowUser) => {
    if (!user || user.id === targetUser.user_id) return null;

    if (targetUser.friendship_status === 'accepted') {
      return (
        <Button variant="secondary" size="sm" disabled>
          Following
        </Button>
      );
    }

    if (targetUser.friendship_status === 'pending') {
      return (
        <Button variant="outline" size="sm" disabled>
          Sent
        </Button>
      );
    }

    return (
      <Button 
        size="sm" 
        onClick={() => handleFollowUser(targetUser.user_id)}
      >
        Follow
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'followers' ? 'Followers' : 'Following'} ({count})
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.map((targetUser) => (
                <div key={targetUser.user_id} className="flex items-center justify-between">
                  <ClickableUserInfo
                    userId={targetUser.user_id}
                    name={targetUser.name}
                    username={targetUser.username}
                    avatar={targetUser.avatar}
                    className="flex items-center gap-3 flex-1"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={targetUser.avatar || ''} />
                      <AvatarFallback>
                        {targetUser.name?.charAt(0) || targetUser.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {targetUser.name || targetUser.username}
                      </p>
                      {targetUser.username && targetUser.name && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{targetUser.username}
                        </p>
                      )}
                    </div>
                  </ClickableUserInfo>
                  
                  {renderActionButton(targetUser)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No {type === 'followers' ? 'followers' : 'following'} yet
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};