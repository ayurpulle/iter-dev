import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, MessageCircle, UserPlus, MapPin, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import UnifiedPostCard from '@/components/UnifiedPostCard';

const Profile = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendFriendRequest, cancelFriendRequest, unfollowUser, getFriendshipStatus } = useFriends();
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'following'>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);

  useEffect(() => {
    if (state?.userData) {
      setProfileData(state.userData);
      loadUserPosts(state.userData.user_id);
      checkFollowStatus(state.userData.user_id);
      loadProfileWithCounts(state.userData.user_id);
    }
  }, [state]);

  const loadProfileWithCounts = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, followers_count, following_count')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (profile) {
        setProfileData(profile);

        // Set up real-time subscription for profile changes
        const channel = supabase
          .channel('profile-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              if (payload.new) {
                setProfileData(prev => ({
                  ...prev,
                  followers_count: payload.new.followers_count || 0,
                  following_count: payload.new.following_count || 0,
                }));
              }
            }
          )
          .subscribe();

        // Listen for manual refresh events
        const handleProfileRefresh = async () => {
          await loadProfileWithCounts(userId);
        };

        window.addEventListener('profile-counts-changed', handleProfileRefresh);

        return () => {
          supabase.removeChannel(channel);
          window.removeEventListener('profile-counts-changed', handleProfileRefresh);
        };
      }
    } catch (error) {
      console.error('Error loading profile with counts:', error);
    }
  };

  const loadUserPosts = async (userId: string) => {
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          trips:trip_id (
            id, title, destination, stops
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUserPosts(posts || []);
    } catch (error) {
      console.error('Error loading user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async (otherUserId: string) => {
    if (!user) return;

    try {
      const friendship = await getFriendshipStatus(otherUserId);
      
      if (friendship) {
        setFriendshipId(friendship.id);
        if (friendship.status === 'accepted') {
          setFollowStatus('following');
        } else if (friendship.status === 'pending') {
          setFollowStatus('pending');
        }
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !profileData) return;

    try {
      const friendship = await sendFriendRequest(profileData.user_id);
      setFriendshipId(friendship.id);
      
      // Check if it was auto-accepted (public profile)
      if (friendship.status === 'accepted') {
        setFollowStatus('following');
        toast({
          title: "Now following",
          description: `You are now following ${profileData.name || profileData.username}`
        });
        // Reload profile data to get updated counts
        await loadProfileWithCounts(profileData.user_id);
      } else {
        setFollowStatus('pending');
        toast({
          title: "Follow request sent",
          description: `Follow request sent to ${profileData.name || profileData.username}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send follow request",
        variant: "destructive"
      });
    }
  };

  const handleUnfollow = async () => {
    if (!user || !profileData) return;

    try {
      await unfollowUser(profileData.user_id);
      setFriendshipId(null);
      setFollowStatus('none');
      toast({
        title: "Unfollowed",
        description: `You unfollowed ${profileData.name || profileData.username}`
      });
      // Reload profile data to get updated counts
      await loadProfileWithCounts(profileData.user_id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unfollow user",
        variant: "destructive"
      });
    }
  };

  const handleUnrequest = async () => {
    if (!friendshipId) return;

    try {
      await cancelFriendRequest(friendshipId);
      setFriendshipId(null);
      setFollowStatus('none');
      toast({
        title: "Request cancelled",
        description: "Follow request has been cancelled"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel request",
        variant: "destructive"
      });
    }
  };

  const handleMessage = async () => {
    if (!user || !profileData) return;

    try {
      // Check if conversation already exists
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id])
        .contains('participants', [profileData.user_id])
        .single();

      if (convError && convError.code !== 'PGRST116') {
        throw convError;
      }

      let conversationId = existingConv?.id;

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            participants: [user.id, profileData.user_id],
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) throw createError;
        conversationId = newConv.id;
      }

      // Navigate to messages with the conversation
      navigate('/messages', { state: { conversationId } });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">No profile data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">Profile</h1>
        <div></div>
      </div>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <Avatar className="h-24 w-24 mx-auto">
            <AvatarImage src={profileData.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {(profileData.name || profileData.username || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="text-2xl font-bold">{profileData.name || 'Unknown User'}</h2>
            <p className="text-muted-foreground">@{profileData.username || 'unknown'}</p>
            {profileData.bio && (
              <p className="text-sm mt-2">{profileData.bio}</p>
            )}
            
            {/* Follower/Following Stats */}
            <div className="flex justify-center gap-6 mt-3">
              <div className="text-center">
                <p className="text-lg font-semibold">{profileData.followers_count || 0}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{profileData.following_count || 0}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{userPosts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
              <Calendar size={12} />
              <span>Member since 2024</span>
            </div>
          </div>

          {/* Action Buttons */}
          {user?.id !== profileData.user_id && (
            <div className="flex gap-2 justify-center">
              {followStatus === 'following' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 max-w-32"
                    >
                      <UserPlus size={16} className="mr-2" />
                      Following
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unfollow {profileData.name || profileData.username}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Their posts will no longer appear in your feed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnfollow}>
                        Unfollow
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  size="sm"
                  onClick={
                    followStatus === 'pending' ? handleUnrequest : handleFollow
                  }
                  variant={followStatus === 'pending' ? 'outline' : 'default'}
                  className="flex-1 max-w-32"
                >
                  <UserPlus size={16} className="mr-2" />
                  {followStatus === 'pending' ? 'Requested' : 'Follow'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMessage}
                className="flex-1 max-w-32"
              >
                <MessageCircle size={16} className="mr-2" />
                Message
              </Button>
            </div>
          )}
        </div>

        {/* Posts Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Posts ({userPosts.length})</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <UnifiedPostCard
                  key={post.id}
                  post={post}
                  profile={profileData}
                  onPostUpdate={() => {
                    // Reload posts when one is updated
                    loadUserPosts(profileData.user_id);
                  }}
                  onPostDelete={() => {
                    // Remove deleted post from local state
                    setUserPosts(prev => prev.filter(p => p.id !== post.id));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;