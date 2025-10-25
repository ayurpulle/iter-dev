import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import UnifiedPostCard from "@/components/UnifiedPostCard";
import { FollowersDialog } from "@/components/FollowersDialog";
import { Calendar, MapPin, Users, Heart, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFriends } from "@/hooks/useFriends";

interface UserProfile {
  user_id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  base_location?: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  created_at?: string;
}

interface UserPost {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  image_url?: string;
  trip_id?: string;
  is_private?: boolean;
  profiles?: {
    id: string;
    user_id: string;
    name: string;
    username: string;
    avatar: string;
  };
  trips?: {
    id: string;
    title?: string;
    destination?: string;
    duration?: string;
    distance?: string;
    cost?: string;
    companions?: string;
    stops?: any;
    images?: string[];
  };
}

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getFriendshipStatus, sendFriendRequest } = useFriends();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<any>(null);
  const [canViewPosts, setCanViewPosts] = useState(false);
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [followersDialogType, setFollowersDialogType] = useState<'followers' | 'following'>('followers');
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);

  useEffect(() => {
    if (username) {
      loadUserProfile();
    }
  }, [username, user]);

  useEffect(() => {
    if (userProfile && user) {
      setIsOwnProfile(userProfile.user_id === user.id);
      if (userProfile.user_id !== user.id) {
        checkFriendshipStatus();
      }
    }
  }, [userProfile, user]);

  useEffect(() => {
    if (userProfile && user) {
      determinePostVisibility();
    }
  }, [userProfile, user, friendshipStatus]);

  const loadUserProfile = async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      
      // First try to find by username, then by user_id (in case someone navigates with user_id)
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      // If not found by username, try by user_id
      if (error && error.code === 'PGRST116') {
        const { data: profileById, error: errorById } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', username)
          .single();
        
        profile = profileById;
        error = errorById;
      }

      if (error) {
        console.error('Error loading profile:', error);
        navigate('/404');
        return;
      }

      if (profile) {
        setUserProfile(profile);
        await loadUserPosts(profile.user_id, profile.is_public);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async (userId: string, isPublic: boolean) => {
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            user_id,
            name,
            username,
            avatar
          ),
          trips (
            id,
            title,
            destination,
            duration,
            distance,
            cost,
            companions,
            stops,
            images
          )
        `)
        .eq('user_id', userId)
        .eq('is_private', false) // Only show public posts
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error);
        return;
      }

      setUserPosts(posts || []);
      setPostCount(posts?.length || 0);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const checkFriendshipStatus = async () => {
    if (!userProfile || !user) return;
    
    try {
      const status = await getFriendshipStatus(userProfile.user_id);
      setFriendshipStatus(status);
    } catch (error) {
      console.error('Error checking friendship status:', error);
    }
  };

  const determinePostVisibility = () => {
    if (!userProfile || !user) return;
    
    // Own profile or public profile
    if (userProfile.user_id === user.id || userProfile.is_public) {
      setCanViewPosts(true);
      return;
    }
    
    // Private profile - check if they're friends
    if (friendshipStatus?.isMutual) {
      setCanViewPosts(true);
    } else {
      setCanViewPosts(false);
    }
  };

  const handleFollowRequest = async () => {
    if (!userProfile) return;
    
    try {
      await sendFriendRequest(userProfile.user_id);
      toast({
        title: "Follow request sent",
        description: `You've sent a follow request to ${userProfile.name || userProfile.username}`,
      });
      // Refresh friendship status
      await checkFriendshipStatus();
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast({
        title: "Error",
        description: "Failed to send follow request",
        variant: "destructive",
      });
    }
  };

  const handleUnfollowUser = async () => {
    if (!userProfile || !user) return;

    try {
      // Find and delete the friendship relationship
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', userProfile.user_id)
        .eq('status', 'accepted');

      if (error) throw error;

      toast({
        title: "Unfollowed",
        description: `You unfollowed ${userProfile.name || userProfile.username}`,
      });
      
      // Refresh friendship status
      await checkFriendshipStatus();
      setShowUnfollowDialog(false);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    }
  };

  const renderActionButton = () => {
    if (isOwnProfile) {
      return (
        <Button 
          variant="outline" 
          onClick={() => navigate('/account')}
          className="w-full"
        >
          Edit Profile
        </Button>
      );
    }

    if (!friendshipStatus) return null;

    if (friendshipStatus.isMutual) {
      return (
        <Button 
          variant="secondary" 
          className="w-full"
          onClick={() => setShowUnfollowDialog(true)}
        >
          Following
        </Button>
      );
    }

    if (friendshipStatus.outgoing?.status === 'pending') {
      return (
        <Button variant="outline" className="w-full" disabled>
          Request Sent
        </Button>
      );
    }

    return (
      <Button onClick={handleFollowRequest} className="w-full">
        Follow
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="pt-16 pb-20 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="pt-16 pb-20 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">User not found</h2>
              <p className="text-muted-foreground mb-4">The profile you're looking for doesn't exist.</p>
              <Button onClick={() => navigate('/')}>Go Home</Button>
            </div>
          </div>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <div className="pt-16 pb-20">
        {/* Profile Header */}
        <div className="bg-card border-b">
          <div className="px-6 py-8">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={userProfile.avatar || ''} />
                <AvatarFallback className="text-2xl">
                  {userProfile.name?.charAt(0) || userProfile.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <h1 className="text-2xl font-bold">
                    {userProfile.name || userProfile.username}
                  </h1>
                  {!userProfile.is_public && (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                {userProfile.username && userProfile.name && (
                  <p className="text-muted-foreground">@{userProfile.username}</p>
                )}
                
                {userProfile.bio && (
                  <p className="text-sm max-w-sm mx-auto">{userProfile.bio}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground justify-center">
                  {userProfile.base_location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{userProfile.base_location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Joined {userProfile.created_at ? 
                        new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) :
                        'recently'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{postCount}</div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </div>
              <div 
                className="text-center cursor-pointer"
                onClick={() => {
                  if (canViewPosts || isOwnProfile) {
                    setFollowersDialogType('followers');
                    setShowFollowersDialog(true);
                  }
                }}
              >
                <div className="text-2xl font-bold">{userProfile.followers_count}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div 
                className="text-center cursor-pointer"
                onClick={() => {
                  if (canViewPosts || isOwnProfile) {
                    setFollowersDialogType('following');
                    setShowFollowersDialog(true);
                  }
                }}
              >
                <div className="text-2xl font-bold">{userProfile.following_count}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="max-w-xs mx-auto">
              {renderActionButton()}
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="px-4 py-6">
          {canViewPosts ? (
            <>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Posts ({postCount})</h2>
              </div>
              
              {userPosts.length > 0 ? (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <UnifiedPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    {isOwnProfile ? "Start sharing your travel experiences!" : `${userProfile.name || userProfile.username} hasn't shared any posts yet.`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Lock className="h-20 w-20 text-muted-foreground/50 mx-auto mb-8" />
              <h3 className="text-2xl font-semibold mb-4">Private Account</h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-lg">
                This account is private. Follow {userProfile.name || userProfile.username} to see their posts.
              </p>
              <div className="max-w-xs mx-auto">
                {renderActionButton()}
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomTabBar />

      {userProfile && (
        <FollowersDialog
          isOpen={showFollowersDialog}
          onClose={() => setShowFollowersDialog(false)}
          userId={userProfile.user_id}
          type={followersDialogType}
          count={followersDialogType === 'followers' ? userProfile.followers_count : userProfile.following_count}
        />
      )}
      
      <AlertDialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfollow {userProfile?.name || userProfile?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their posts will no longer appear in your feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfollowUser}>Unfollow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;