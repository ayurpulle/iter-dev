import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import TravelMap from "@/components/TravelMap";
import { Globe, MapPin, Calendar, Settings, Heart, MessageCircle, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

const Account = () => {
  const [activeSection, setActiveSection] = useState<"posts" | "saved" | "world">("posts");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Mock user data
  const userData = {
    name: "John Doe",
    username: "johndoe",
    avatar: undefined,
    stats: {
      posts: 24,
      followers: 1234,
      following: 567,
    },
    bio: "Travel enthusiast exploring the world one city at a time ✈️",
    joinDate: "March 2023",
  };

  // Mock user posts
  const userPosts = [
    {
      id: 1,
      title: "Japan Adventure",
      image: "/placeholder.svg",
      location: "Tokyo, Japan",
      date: "Dec 2024",
      likes: 156,
    },
    {
      id: 2,
      title: "European Tour",
      image: "/placeholder.svg",
      location: "Paris, France",
      date: "Nov 2024",
      likes: 234,
    },
    {
      id: 3,
      title: "Bali Getaway",
      image: "/placeholder.svg",
      location: "Bali, Indonesia",
      date: "Oct 2024",
      likes: 189,
    },
    {
      id: 4,
      title: "NYC Weekend",
      image: "/placeholder.svg",
      location: "New York, USA",
      date: "Sep 2024",
      likes: 267,
    },
    {
      id: 5,
      title: "Iceland Road Trip",
      image: "/placeholder.svg",
      location: "Reykjavik, Iceland",
      date: "Aug 2024",
      likes: 312,
    },
    {
      id: 6,
      title: "Thai Islands",
      image: "/placeholder.svg",
      location: "Phuket, Thailand",
      date: "Jul 2024",
      likes: 198,
    },
  ];

  // Mock visited countries for the map
  const visitedCountries = [
    "Japan", "France", "Indonesia", "USA", "Iceland", "Thailand",
    "Germany", "Italy", "Spain", "Australia", "Canada", "Mexico"
  ];

  // Mock travel statistics
  const travelStats = {
    countriesVisited: visitedCountries.length,
    totalCountries: 195,
    citiesVisited: 48,
    totalCities: 10000,
    totalDistance: 87540,
    totalDays: 156,
  };

  // Load saved posts when saved section is selected
  useEffect(() => {
    if (activeSection === 'saved' && user) {
      loadSavedPosts();
    }
  }, [activeSection, user]);

  const loadSavedPosts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: savedPostsData, error } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
        const postIds = savedPostsData.map(sp => sp.post_id);
        
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

  const handleUnsavePost = async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-6">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={userData.avatar} />
            <AvatarFallback className="text-2xl font-semibold">
              {userData.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-bold mb-1">{userData.name}</h1>
          <p className="text-muted-foreground mb-2">@{userData.username}</p>
          <p className="text-sm mb-4">{userData.bio}</p>
          
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-4">
            <Calendar size={12} />
            <span>Joined {userData.joinDate}</span>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold">{userData.stats.posts}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{userData.stats.followers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{userData.stats.following}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button variant="outline" size="sm" className="flex-1">
              Edit Profile
            </Button>
            <Button variant="outline" size="sm">
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
            My Posts
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
            <h2 className="text-lg font-semibold">My Posts ({userData.stats.posts})</h2>
            <div className="grid grid-cols-2 gap-3">
              {userPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-white text-sm font-medium truncate">{post.title}</h3>
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <MapPin size={10} />
                        <span className="truncate">{post.location}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{post.date}</span>
                      <span>{post.likes} likes</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeSection === "saved" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Saved Posts ({savedPosts.length})</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading saved posts...</p>
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark size={48} className="mx-auto mb-4 text-muted-foreground" />
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
                          <Bookmark size={16} className="fill-current" />
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

            {/* Visited Countries List */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Countries Visited ({visitedCountries.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {visitedCountries.map((country) => (
                    <Badge key={country} variant="secondary" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  );
};

export default Account;