import { useState, useEffect } from "react";
import { Search as SearchIcon, Users, MapPin, Hash, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import UnifiedPostCard from "@/components/UnifiedPostCard";
import ClickableUserInfo from "@/components/ClickableUserInfo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  type: 'user' | 'location' | 'hashtag';
  title: string;
  subtitle?: string;
  avatar?: string;
  initials?: string;
  tripCount?: number;
  data?: any;
}

interface Trip {
  id: string;
  title: string;
  duration: string;
  distance: string;
  stops: any;
  photo_count: number;
  hashtags: string[];
  user_id: string;
  profiles: {
    name: string;
    username: string;
    avatar: string;
  } | null;
}

const GlobalSearchPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [exploreTrips, setExploreTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const loadExploreContent = async () => {
    setExploreLoading(true);
    try {
      // Fetch posts for explore instead of trips to match other pages
      const { data: postsData, error } = await supabase
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
        .eq('is_private', false)
        .not('trips', 'is', null) // Only show posts that have trips
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Convert posts to trip-like format for backwards compatibility
      const transformedTrips: Trip[] = (postsData || [])
        .filter(post => post.trips) // Double filter to ensure trips exist
        .map(post => ({
          id: post.trips.id,
          title: post.trips.title || 'Untitled Trip',
          duration: post.trips.duration || '',
          distance: post.trips.distance || '',
          stops: post.trips.stops || [],
          photo_count: post.trips.images?.length || 0,
          hashtags: [],
          user_id: post.user_id,
          profiles: post.profiles ? {
            name: post.profiles.name,
            username: post.profiles.username,
            avatar: post.profiles.avatar
          } : null
        }));

      setExploreTrips(transformedTrips);
    } catch (error) {
      console.error('Explore loading error:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load explore content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExploreLoading(false);
    }
  };

  // Load explore content on component mount
  useEffect(() => {
    loadExploreContent();
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setTrips([]);
      return;
    }

    setLoading(true);
    try {
      const results: SearchResult[] = [];

      // Search users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (usersError) throw usersError;

      users?.forEach(user => {
        results.push({
          id: user.id,
          type: 'user',
          title: user.name || user.username || 'Unknown User',
          subtitle: user.username ? `@${user.username}` : undefined,
          avatar: user.avatar,
          initials: (user.name || user.username || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          data: user
        });
      });

      // Search locations in posts (not trips directly)
      const { data: locationPosts, error: locationError } = await supabase
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
            duration,
            distance,
            stops,
            photo_count,
            hashtags,
            images
          )
        `)
        .eq('is_private', false)
        .not('trips', 'is', null)
        .limit(50);

      if (locationError) throw locationError;

      // Group by location - now using posts data
      const locationMap = new Map();
      locationPosts?.forEach(post => {
        if (post.trips?.stops && Array.isArray(post.trips.stops)) {
          (post.trips.stops as any[]).forEach((stop: any) => {
            if (stop.name && stop.name.toLowerCase().includes(query.toLowerCase())) {
              const locationKey = stop.name;
              const tripWithProfile = {
                id: post.trips.id,
                title: post.trips.title || 'Untitled Trip',
                duration: post.trips.duration || '',
                distance: post.trips.distance || '',
                stops: post.trips.stops || [],
                photo_count: post.trips.images?.length || 0,
                hashtags: post.trips.hashtags || [],
                user_id: post.user_id,
                profiles: post.profiles ? {
                  name: post.profiles.name,
                  username: post.profiles.username,
                  avatar: post.profiles.avatar
                } : null
              };
              
              if (!locationMap.has(locationKey)) {
                locationMap.set(locationKey, {
                  id: `location-${locationKey}`,
                  type: 'location',
                  title: locationKey,
                  subtitle: `Visited by friends`,
                  tripCount: 1,
                  data: { name: locationKey, trips: [tripWithProfile] }
                });
              } else {
                const existing = locationMap.get(locationKey);
                existing.data.trips.push(tripWithProfile);
                existing.tripCount = existing.data.trips.length;
              }
            }
          });
        }
      });

      locationMap.forEach(location => results.push(location));

      // Search hashtags in posts (not trips directly)
      const { data: hashtagPosts, error: hashtagError } = await supabase
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
            duration,
            distance,
            stops,
            photo_count,
            hashtags,
            images
          )
        `)
        .eq('is_private', false)
        .not('trips', 'is', null)
        .limit(50);

      if (hashtagError) throw hashtagError;

      // Group by hashtag - now using posts data
      const hashtagMap = new Map();
      hashtagPosts?.forEach(post => {
        if (post.trips?.hashtags && Array.isArray(post.trips.hashtags)) {
          post.trips.hashtags.forEach((hashtag: string) => {
            if (hashtag.toLowerCase().includes(query.toLowerCase())) {
              const tripWithProfile = {
                id: post.trips.id,
                title: post.trips.title || 'Untitled Trip',
                duration: post.trips.duration || '',
                distance: post.trips.distance || '',
                stops: post.trips.stops || [],
                photo_count: post.trips.images?.length || 0,
                hashtags: post.trips.hashtags || [],
                user_id: post.user_id,
                profiles: post.profiles ? {
                  name: post.profiles.name,
                  username: post.profiles.username,
                  avatar: post.profiles.avatar
                } : null
              };
              
              if (!hashtagMap.has(hashtag)) {
                hashtagMap.set(hashtag, {
                  id: `hashtag-${hashtag}`,
                  type: 'hashtag',
                  title: `#${hashtag}`,
                  subtitle: `Used in trips`,
                  tripCount: 1,
                  data: { hashtag, trips: [tripWithProfile] }
                });
              } else {
                const existing = hashtagMap.get(hashtag);
                existing.tripCount++;
                existing.data.trips.push(tripWithProfile);
              }
            }
          });
        }
      });

      hashtagMap.forEach(hashtag => results.push(hashtag));

      // Get all trips for trip results from both location and hashtag posts
      const allTripData: Trip[] = [];
      
      // Add trips from location search
      locationPosts?.forEach(post => {
        if (post.trips && post.trips.stops && Array.isArray(post.trips.stops)) {
          const hasMatchingLocation = (post.trips.stops as any[]).some((stop: any) => 
            stop.name && stop.name.toLowerCase().includes(query.toLowerCase())
          );
          if (hasMatchingLocation) {
            allTripData.push({
              id: post.trips.id,
              title: post.trips.title || 'Untitled Trip',
              duration: post.trips.duration || '',
              distance: post.trips.distance || '',
              stops: post.trips.stops || [],
              photo_count: post.trips.images?.length || 0,
              hashtags: post.trips.hashtags || [],
              user_id: post.user_id,
              profiles: post.profiles ? {
                name: post.profiles.name,
                username: post.profiles.username,
                avatar: post.profiles.avatar
              } : null
            });
          }
        }
      });

      // Add trips from hashtag search
      hashtagPosts?.forEach(post => {
        if (post.trips && post.trips.hashtags && Array.isArray(post.trips.hashtags)) {
          const hasMatchingHashtag = post.trips.hashtags.some((hashtag: string) =>
            hashtag.toLowerCase().includes(query.toLowerCase())
          );
          if (hasMatchingHashtag && !allTripData.find(t => t.id === post.trips.id)) {
            allTripData.push({
              id: post.trips.id,
              title: post.trips.title || 'Untitled Trip',
              duration: post.trips.duration || '',
              distance: post.trips.distance || '',
              stops: post.trips.stops || [],
              photo_count: post.trips.images?.length || 0,
              hashtags: post.trips.hashtags || [],
              user_id: post.user_id,
              profiles: post.profiles ? {
                name: post.profiles.name,
                username: post.profiles.username,
                avatar: post.profiles.avatar
              } : null
            });
          }
        }
      });

      setSearchResults(results);
      setTrips(allTripData);

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const filteredResults = searchResults.filter(result => {
    if (activeTab === "all") return true;
    return result.type === activeTab;
  });

  const filteredTrips = trips.filter(trip => {
    if (activeTab === "all") return true;
    if (activeTab === "location") {
      return Array.isArray(trip.stops) && trip.stops.some((stop: any) => 
        stop.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeTab === "hashtag") {
      return Array.isArray(trip.hashtags) && trip.hashtags.some((hashtag: string) => 
        hashtag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return false;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users size={16} className="text-blue-500" />;
      case 'location': return <MapPin size={16} className="text-green-500" />;
      case 'hashtag': return <Hash size={16} className="text-purple-500" />;
      default: return <SearchIcon size={16} />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'user' && result.data) {
      const username = result.data.username || result.data.user_id;
      if (username) {
        navigate(`/profile/${username}`);
      }
    }
    // For location and hashtag results, we could implement filtering or navigation in the future
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Search Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {searchQuery ? 'Search Results' : 'Explore & Search'}
            </h1>
            <p className="text-muted-foreground">
              {searchQuery ? `Results for "${searchQuery}"` : 'Discover popular trips and find users, locations, or hashtags'}
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users, locations, or hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            )}
          </div>

          {/* Results Tabs */}
          {searchQuery ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="user">Users</TabsTrigger>
                <TabsTrigger value="location">Places</TabsTrigger>
                <TabsTrigger value="hashtag">Tags</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Searching...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search Results */}
                    {filteredResults.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Results
                        </h3>
                         {filteredResults.map((result) => (
                           <Card 
                             key={result.id} 
                             className="cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleResultClick(result)}
                           >
                            <CardContent className="p-4">
                               <div className="flex items-center gap-3">
                                 {result.type === 'user' ? (
                                   <ClickableUserInfo
                                     username={result.data?.username}
                                     name={result.data?.name}
                                     avatar={result.avatar}
                                     userId={result.data?.user_id}
                                     className="flex items-center gap-3 flex-1"
                                   >
                                     <Avatar className="w-10 h-10">
                                       <AvatarImage src={result.avatar} />
                                       <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                         {result.initials}
                                       </AvatarFallback>
                                     </Avatar>
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2">
                                         <p className="font-medium text-sm truncate">{result.title}</p>
                                         <Badge variant="secondary" className="text-xs">
                                           {result.type}
                                         </Badge>
                                       </div>
                                       {result.subtitle && (
                                         <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                                       )}
                                       {result.tripCount && (
                                         <p className="text-xs text-muted-foreground">
                                           {result.tripCount} trip{result.tripCount !== 1 ? 's' : ''}
                                         </p>
                                       )}
                                     </div>
                                   </ClickableUserInfo>
                                 ) : (
                                   <>
                                     <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                       {getIcon(result.type)}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2">
                                         <p className="font-medium text-sm truncate">{result.title}</p>
                                         <Badge variant="secondary" className="text-xs">
                                           {result.type}
                                         </Badge>
                                       </div>
                                       {result.subtitle && (
                                         <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                                       )}
                                       {result.tripCount && (
                                         <p className="text-xs text-muted-foreground">
                                           {result.tripCount} trip{result.tripCount !== 1 ? 's' : ''}
                                         </p>
                                       )}
                                     </div>
                                   </>
                                 )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Trip Results */}
                    {filteredTrips.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Trips
                        </h3>
                         {filteredTrips.map((trip) => (
                           <Card key={trip.id} className="overflow-hidden">
                             <CardContent className="p-0">
                               <div className="flex items-start gap-3 p-4">
                                 <Avatar className="w-10 h-10">
                                   <AvatarImage src={trip.profiles?.avatar} />
                                   <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                     {(trip.profiles?.name || trip.profiles?.username || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                                   </AvatarFallback>
                                 </Avatar>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-1">
                                     <p className="font-medium text-sm">{trip.profiles?.name || 'Unknown User'}</p>
                                     <p className="text-xs text-muted-foreground">@{trip.profiles?.username || 'unknown'}</p>
                                   </div>
                                   <h3 className="font-semibold text-base mb-2">{trip.title || 'Untitled Trip'}</h3>
                                   <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                                     <span>{trip.duration || '0 hours'}</span>
                                     <span>{trip.distance || '0 km'}</span>
                                     <span>{trip.photo_count || 0} photos</span>
                                   </div>
                                   <div className="flex flex-wrap gap-1">
                                     {(trip.hashtags || []).map((tag, index) => (
                                       <Badge key={index} variant="secondary" className="text-xs">
                                         #{tag}
                                       </Badge>
                                     ))}
                                   </div>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                         ))}
                      </div>
                    )}

                    {filteredResults.length === 0 && filteredTrips.length === 0 && (
                      <div className="text-center py-8">
                        <SearchIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* Explore Content */
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Explore Popular Trips</h2>
                <p className="text-muted-foreground">Discover amazing journeys from the community</p>
              </div>

              {exploreLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="h-20 bg-muted rounded mb-3"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-muted rounded w-16"></div>
                          <div className="h-6 bg-muted rounded w-20"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {exploreTrips.map((trip) => {
                    // Convert trip to post format for unified display
                    const postData = {
                      id: trip.id,
                      content: `Shared a journey: ${trip.title}`,
                      user_id: trip.user_id,
                      trip_id: trip.id,
                      created_at: new Date().toISOString(),
                      likes_count: 0,
                      comments_count: 0,
                      profiles: trip.profiles ? {
                        id: `profile-${trip.user_id}`,
                        user_id: trip.user_id,
                        name: trip.profiles.name,
                        username: trip.profiles.username,
                        avatar: trip.profiles.avatar
                      } : null,
                      trips: {
                        id: trip.id,
                        title: trip.title,
                        duration: trip.duration,
                        distance: trip.distance,
                        stops: trip.stops
                      }
                    };

                    return (
                      <UnifiedPostCard
                        key={trip.id}
                        post={postData}
                        onDelete={() => {}}
                      />
                    );
                  })}

                  {exploreTrips.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No trips to explore yet</h3>
                      <p className="text-muted-foreground">Be the first to share your adventure!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
};

export default GlobalSearchPage;