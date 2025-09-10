import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import TravelMap from "@/components/TravelMap";
import EditProfile from "@/components/EditProfile";
import { Globe, MapPin, Calendar, Settings, Heart, MessageCircle, Plus, Folder, FolderOpen, Edit, LogOut, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import UnifiedPostCard from "@/components/UnifiedPostCard";

interface SavedPost {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  profiles?: {
    name: string;
    username: string;
    avatar: string;
  };
}

interface ItemFolder {
  id: string;
  name: string;
}

const Account = () => {
  const [activeSection, setActiveSection] = useState<"posts" | "saved" | "world">("posts");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [folders, setFolders] = useState<ItemFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // User profile data
  const [userProfile, setUserProfile] = useState({
    name: "",
    username: "",
    avatar: undefined,
    stats: {
      posts: 0,
      followers: 0,
      following: 0,
    },
    bio: "",
    joinDate: "",
  });

  // User posts
  const [userPosts, setUserPosts] = useState([]);

  // Calculate travel stats from user posts
  const [travelStats, setTravelStats] = useState({
    countriesVisited: 0,
    totalCountries: 195,
    citiesVisited: 0,
    totalCities: 10000,
    totalDistance: 0,
    totalDays: 0,
  });
  
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);

  // Load user profile and posts on mount
  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserPosts();
    }
  }, [user]);

  // Load saved posts and folders when saved section is selected
  useEffect(() => {
    if (activeSection === 'saved' && user) {
      loadFolders();
      loadSavedPosts();
    }
  }, [activeSection, user]);

  // Reload saved posts when folder selection changes
  useEffect(() => {
    if (activeSection === 'saved' && user) {
      loadSavedPosts();
    }
  }, [selectedFolder]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, followers_count, following_count')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        setUserProfile({
          name: profile.name || user.email?.split('@')[0] || '',
          username: profile.username || user.email?.split('@')[0] || '',
          avatar: profile.avatar,
          stats: {
            posts: 0, // Will be updated when posts are loaded
            followers: profile.followers_count || 0,
            following: profile.following_count || 0,
          },
          bio: profile.bio || '',
          joinDate: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        });
      }

      // Set up real-time subscription for profile changes
      const channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload.new);
            if (payload.new) {
              setUserProfile(prev => ({
                ...prev,
                stats: {
                  ...prev.stats,
                  followers: payload.new.followers_count || 0,
                  following: payload.new.following_count || 0,
                }
              }));
            }
          }
        )
        .subscribe();

      // Listen for manual refresh events
      const handleProfileRefresh = async () => {
        console.log('Manual profile refresh triggered');
        await loadUserProfile();
      };

      window.addEventListener('profile-counts-changed', handleProfileRefresh);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('profile-counts-changed', handleProfileRefresh);
      };
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserPosts = async () => {
    if (!user) return;
    
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error);
        return;
      }

      console.log('Loaded posts:', posts);
      console.log('Posts length:', posts?.length);
      
      setUserPosts(posts || []);
      
      // Update post count in profile
      const postCount = posts?.length || 0;
      console.log('Setting post count to:', postCount);
      
      setUserProfile(prev => {
        const updatedProfile = {
          ...prev,
          stats: {
            ...prev.stats,
            posts: postCount,
          },
        };
        console.log('Updated profile stats:', updatedProfile.stats);
        return updatedProfile;
      });
      
      // Calculate travel statistics from posts
      calculateTravelStats(posts || []);

      // Set up real-time subscription for posts
      const channel = supabase
        .channel('user-posts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Reload posts when changes occur
            loadUserPosts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadFolders = async () => {
    if (!user) return;
    
    try {
      const { data: foldersData, error } = await supabase
        .from('item_folders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error loading folders:', error);
        return;
      }

      setFolders(foldersData || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadSavedPosts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('saved_items')
        .select('item_id, folder_id')
        .eq('user_id', user.id)
        .eq('item_type', 'post');

      // Filter by folder if not "all"
      if (selectedFolder !== "all") {
        if (selectedFolder === "none") {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', selectedFolder);
        }
      }

      const { data: savedPostsData, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved posts:', error);
        toast({
          title: "Error",
          description: "Failed to load saved posts",
          variant: "destructive",
        });
        return;
      }

      if (savedPostsData && savedPostsData.length > 0) {
        const postIds = savedPostsData.map(sp => sp.item_id);
        
        // Fetch the actual posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds);

        if (postsError) {
          console.error('Error loading posts data:', postsError);
          return;
        }

        if (postsData) {
          // Fetch profiles for post authors
          const userIds = postsData.map(p => p.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, name, username, avatar')
            .in('user_id', userIds);

          const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

          const enrichedPosts = postsData.map(post => ({
            ...post,
            profiles: profilesMap.get(post.user_id)
          }));

          setSavedPosts(enrichedPosts);
        }
      } else {
        setSavedPosts([]);
      }
    } catch (error) {
      console.error('Error loading saved posts:', error);
      toast({
        title: "Error",
        description: "Failed to load saved posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTravelStats = (posts: any[]) => {
    const countries = new Set<string>();
    const cities = new Set<string>();
    let totalDistance = 0;
    let totalDays = 0;
    
    console.log('Calculating travel stats from posts:', posts);
    
    posts.forEach(post => {
      console.log('Processing post:', post);
      
      // Extract location data from trips
      if (post.trips?.stops) {
        console.log('Trip stops found:', post.trips.stops);
        try {
          const stops = Array.isArray(post.trips.stops) ? post.trips.stops : JSON.parse(post.trips.stops);
          console.log('Parsed stops:', stops);
          stops.forEach((stop: any) => {
            console.log('Processing stop:', stop);
            if (stop.country) {
              countries.add(stop.country);
              console.log('Added country:', stop.country);
            }
            if (stop.city) {
              cities.add(stop.city);
              console.log('Added city:', stop.city);
            }
            // Also check for alternative field names
            if (stop.country_code) {
              countries.add(stop.country_code);
              console.log('Added country_code:', stop.country_code);
            }
            if (stop.location) {
              cities.add(stop.location);
              console.log('Added location as city:', stop.location);
            }
          });
        } catch (e) {
          console.log('Error parsing stops:', e);
        }
      }
      
      // Also check trip destination and other location fields
      if (post.trips?.destination) {
        console.log('Trip destination:', post.trips.destination);
        cities.add(post.trips.destination);
      }
      
      // Add trip distance and duration
      if (post.trips?.distance) {
        const distance = parseFloat(post.trips.distance.toString().replace(/[^\d.]/g, ''));
        if (!isNaN(distance)) totalDistance += distance;
      }
      
      if (post.trips?.duration) {
        const duration = parseFloat(post.trips.duration.toString().replace(/[^\d.]/g, ''));
        if (!isNaN(duration)) totalDays += duration;
      }
    });
    
    const countriesArray = Array.from(countries);
    console.log('Final countries:', countriesArray);
    console.log('Final cities:', Array.from(cities));
    console.log('Final stats:', {
      countries: countries.size,
      cities: cities.size,
      distance: totalDistance,
      days: totalDays
    });
    
    setVisitedCountries(countriesArray);
    setTravelStats({
      countriesVisited: countries.size,
      totalCountries: 195,
      citiesVisited: cities.size,
      totalCities: 10000,
      totalDistance: Math.round(totalDistance),
      totalDays: Math.round(totalDays),
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return;

    try {
      // Delete the folder (posts will remain in 'all posts')
      const { error } = await supabase
        .from('item_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setFolders(prev => prev.filter(f => f.id !== folderId));
      
      // If currently viewing the deleted folder, switch to 'all'
      if (selectedFolder === folderId) {
        setSelectedFolder('all');
      }

      toast({
        title: "Folder deleted",
        description: "The folder has been deleted. All posts remain in your collection.",
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    }
  };

  const handleUnsavePost = async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', postId)
        .eq('item_type', 'post');

      if (error) {
        console.error('Error unsaving post:', error);
        return;
      }

      // Remove from local state
      setSavedPosts(prev => prev.filter(post => post.id !== postId));
      
      toast({
        title: "Post unsaved",
        description: "Removed from your saved posts",
      });
    } catch (error) {
      console.error('Error unsaving post:', error);
    }
  };

  const handleBackFromEdit = () => {
    setShowEditProfile(false);
    // Reload profile data when returning from edit
    loadUserProfile();
  };
  
  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove from local state
      setUserPosts(prev => prev.filter(p => p.id !== postId));

      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  if (showEditProfile) {
    return <EditProfile onBack={handleBackFromEdit} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-6">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={userProfile.avatar} />
            <AvatarFallback className="text-2xl font-semibold">
              {userProfile.name ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-bold mb-1">{userProfile.name || user?.email?.split('@')[0] || 'User'}</h1>
          <p className="text-muted-foreground mb-2">@{userProfile.username || user?.email?.split('@')[0] || 'user'}</p>
          <p className="text-sm mb-4">{userProfile.bio || 'No bio yet'}</p>
          
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-4">
            <Calendar size={12} />
            <span>Joined {userProfile.joinDate || 'Recently'}</span>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold">{userProfile.stats.posts}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{userProfile.stats.followers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{userProfile.stats.following}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setShowEditProfile(true)}
            >
              <Edit size={16} className="mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/settings')}
            >
              <Settings size={16} />
            </Button>
          </div>
        </div>

        {/* Section Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeSection === "posts" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setActiveSection("posts")}
          >
            My Posts ({userProfile.stats.posts})
          </Button>
          <Button
            variant={activeSection === "saved" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setActiveSection("saved")}
          >
            Saved Posts
          </Button>
          <Button
            variant={activeSection === "world" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setActiveSection("world")}
          >
            My World
          </Button>
        </div>

        {/* Content Sections */}
        {activeSection === "posts" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">My Posts ({userProfile.stats.posts})</h2>
            {userPosts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-muted-foreground mb-2">No posts yet</p>
                <p className="text-sm text-muted-foreground">Start sharing your travel experiences!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <UnifiedPostCard
                    key={post.id}
                    post={post}
                    onDelete={() => {
                      setUserPosts(prev => prev.filter(p => p.id !== post.id));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "saved" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Saved Posts ({savedPosts.length})</h2>
            
            {/* Folder Icons Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button
                variant={selectedFolder === "all" ? "default" : "outline"}
                className="h-20 flex-col gap-2 p-3"
                onClick={() => setSelectedFolder("all")}
              >
                <FolderOpen size={24} />
                <span className="text-xs">All Posts</span>
              </Button>
              
              {folders.map((folder) => (
                <div key={folder.id} className="relative group">
                  <Button
                    variant={selectedFolder === folder.id ? "default" : "outline"}
                    className="h-20 flex-col gap-2 p-3 w-full"
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <Folder size={24} />
                    <span className="text-xs text-center leading-tight">{folder.name}</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading saved posts...</p>
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="text-center py-8">
                <Plus size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No saved posts yet</p>
                <p className="text-sm text-muted-foreground">Posts you save will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedPosts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={post.profiles?.avatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {post.profiles?.name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{post.profiles?.name || 'Unknown User'}</p>
                              <p className="text-xs text-muted-foreground">@{post.profiles?.username || 'unknown'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-4">{post.content}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Heart size={16} />
                            <span className="text-sm">{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MessageCircle size={16} />
                            <span className="text-sm">{post.comments_count}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-primary"
                          onClick={() => handleUnsavePost(post.id)}
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "world" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe size={20} />
              My World
            </h2>
            
            <TravelMap 
              visitedCountries={visitedCountries}
              travelStats={travelStats}
            />

          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  );
};

export default Account;