import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MessageCircle, UserPlus, MapPin, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const Profile = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendFriendRequest, cancelFriendRequest, getFriendshipStatus } = useFriends();
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
    }
  }, [state]);

  const loadUserPosts = async (userId: string) => {
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
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

  const handleMessage = () => {
    navigate('/messages', { state: { userId: profileData.user_id } });
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
            
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
              <Calendar size={12} />
              <span>Member since 2024</span>
            </div>
          </div>

          {/* Action Buttons */}
          {user?.id !== profileData.user_id && (
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                onClick={followStatus === 'pending' ? handleUnrequest : handleFollow}
                disabled={followStatus === 'following'}
                variant={followStatus === 'pending' ? 'outline' : 'default'}
                className="flex-1 max-w-32"
              >
                <UserPlus size={16} className="mr-2" />
                {followStatus === 'following' ? 'Following' : 
                 followStatus === 'pending' ? 'Unrequest' : 'Follow'}
              </Button>
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
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profileData.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {(profileData.name || profileData.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{profileData.name || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground">@{profileData.username || 'unknown'}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-4">{post.content}</p>
                    
                    {post.image_url && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="w-full h-auto max-h-80 object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Heart size={16} />
                        <span className="text-sm">{post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageCircle size={16} />
                        <span className="text-sm">{post.comments_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;