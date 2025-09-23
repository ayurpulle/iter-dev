import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<FollowUser | null>(null);
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
      let friendsData;
      
      if (type === 'followers') {
        // Get users who follow this user
        const { data, error } = await supabase
          .from('friends')
          .select('user_id')
          .eq('friend_id', userId)
          .eq('status', 'accepted');
        
        if (error) throw error;
        friendsData = data || [];
      } else {
        // Get users this user follows
        const { data, error } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', userId)
          .eq('status', 'accepted');
        
        if (error) throw error;
        friendsData = data || [];
      }

      if (friendsData.length === 0) {
        setUsers([]);
        return;
      }

      // Get user IDs
      const userIds = type === 'followers' 
        ? friendsData.map(item => item.user_id)
        : friendsData.map(item => item.friend_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, username, avatar')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Transform data and check friendship status for current user
      const transformedUsers = await Promise.all(
        (profilesData || []).map(async (profile: any) => {
          // For users in the Following list, they are already being followed
          // For users in the Followers list, check if current user follows them back
          let isFollowing = false;
          
          if (type === 'following') {
            // If this is the Following list, we know the main user follows these people
            isFollowing = true;
          } else if (type === 'followers' && user && user.id !== profile.user_id) {
            // If this is the Followers list, check if current user follows them back
            try {
              const { data: followingCheck } = await supabase
                .from('friends')
                .select('id')
                .eq('user_id', user.id)
                .eq('friend_id', profile.user_id)
                .eq('status', 'accepted')
                .maybeSingle();
              
              isFollowing = !!followingCheck;
            } catch (error) {
              console.error('Error checking follow status:', error);
            }
          }

          return {
            user_id: profile.user_id,
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar,
            is_following: isFollowing
          };
        })
      );

      setUsers(transformedUsers);
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
          ? { ...u, is_following: false, friendship_status: 'pending' }
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

  const handleUnfollowUser = async (targetUser: FollowUser) => {
    setUserToUnfollow(targetUser);
    setShowUnfollowDialog(true);
  };

  const confirmUnfollow = async () => {
    if (!user || !userToUnfollow) return;

    try {
      // Find and delete the friendship relationship
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', userToUnfollow.user_id)
        .eq('status', 'accepted');

      if (error) throw error;

      toast({
        title: "Unfollowed",
        description: `You unfollowed ${userToUnfollow.name || userToUnfollow.username}`,
      });
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userToUnfollow.user_id 
          ? { ...u, is_following: false }
          : u
      ));
      
      setShowUnfollowDialog(false);
      setUserToUnfollow(null);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    }
  };

  const renderActionButton = (targetUser: FollowUser) => {
    if (!user || user.id === targetUser.user_id) return null;

    if (targetUser.is_following) {
      return (
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => handleUnfollowUser(targetUser)}
        >
          Following
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

      <AlertDialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfollow {userToUnfollow?.name || userToUnfollow?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their posts will no longer appear in your feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnfollow}>Unfollow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};