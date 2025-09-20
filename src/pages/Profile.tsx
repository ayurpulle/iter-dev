import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import UnifiedPostCard from "@/components/UnifiedPostCard";
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
      determinePostVisibility();
    }
  }, [userProfile, user]);

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
    if (friendshipStatus?.mutualStatus === 'accepted') {
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

    if (friendshipStatus.mutualStatus === 'accepted') {
      return (
        <Button variant="secondary" className="w-full" disabled>
          Following
        </Button>
      );
    }

    if (friendshipStatus.outgoingStatus === 'pending') {
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
          <div className="px-6 py-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userProfile.avatar || ''} />
                <AvatarFallback className="text-lg">
                  {userProfile.name?.charAt(0) || userProfile.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate">
                    {userProfile.name || userProfile.username}
                  </h1>
                  {!userProfile.is_public && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                {userProfile.username && userProfile.name && (
                  <p className="text-muted-foreground text-sm mb-2">@{userProfile.username}</p>
                )}
                
                {userProfile.bio && (
                  <p className="text-sm mb-3">{userProfile.bio}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
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
                
                <div className="flex items-center gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{postCount}</span>
                    <span className="text-muted-foreground">posts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{userProfile.followers_count}</span>
                    <span className="text-muted-foreground">followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{userProfile.following_count}</span>
                    <span className="text-muted-foreground">following</span>
                  </div>
                </div>
                
                {renderActionButton()}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="px-4 py-6">
          {canViewPosts ? (
            userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <UnifiedPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "Start sharing your travel experiences!" : `${userProfile.name || userProfile.username} hasn't shared any posts yet.`}
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <Lock className="h-16 w-16 text-muted-foreground/50 mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-2">Private Account</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                This account is private. Follow {userProfile.name || userProfile.username} to see their posts.
              </p>
              {renderActionButton()}
            </div>
          )}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Profile;