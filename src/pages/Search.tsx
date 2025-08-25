import { useState, useEffect } from "react";
import { Search as SearchIcon, Users, MapPin, Hash, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import TripCard from "@/components/TripCard";
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

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

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

      // Search locations in trips
      const { data: locationTrips, error: locationError } = await supabase
        .from('trips')
        .select(`
          id,
          title,
          duration,
          distance,
          stops,
          photo_count,
          hashtags,
          user_id,
          profiles!inner (name, username, avatar)
        `)
        .eq('is_public', true)
        .limit(10);

      if (locationError) throw locationError;

      // Group by location
      const locationMap = new Map();
      locationTrips?.forEach(trip => {
        if (trip.stops && Array.isArray(trip.stops)) {
          (trip.stops as any[]).forEach((stop: any) => {
            if (stop.name && stop.name.toLowerCase().includes(query.toLowerCase())) {
              const locationKey = stop.name;
              if (!locationMap.has(locationKey)) {
                locationMap.set(locationKey, {
                  id: `location-${locationKey}`,
                  type: 'location',
                  title: locationKey,
                  subtitle: `Visited by friends`,
                  tripCount: 1,
                  data: { name: locationKey, trips: [trip] }
                });
              } else {
                const existing = locationMap.get(locationKey);
                existing.tripCount++;
                existing.data.trips.push(trip);
              }
            }
          });
        }
      });

      locationMap.forEach(location => results.push(location));

      // Search hashtags
      const { data: hashtagTrips, error: hashtagError } = await supabase
        .from('trips')
        .select(`
          id,
          title,
          duration,
          distance,
          stops,
          photo_count,
          hashtags,
          user_id,
          profiles!inner (name, username, avatar)
        `)
        .eq('is_public', true)
        .limit(10);

      if (hashtagError) throw hashtagError;

      // Group by hashtag - filter in memory for now
      const hashtagMap = new Map();
      hashtagTrips?.forEach(trip => {
        if (trip.hashtags && Array.isArray(trip.hashtags)) {
          trip.hashtags.forEach((hashtag: string) => {
            if (hashtag.toLowerCase().includes(query.toLowerCase())) {
              if (!hashtagMap.has(hashtag)) {
                hashtagMap.set(hashtag, {
                  id: `hashtag-${hashtag}`,
                  type: 'hashtag',
                  title: `#${hashtag}`,
                  subtitle: `Used in trips`,
                  tripCount: 1,
                  data: { hashtag, trips: [trip] }
                });
              } else {
                const existing = hashtagMap.get(hashtag);
                existing.tripCount++;
                existing.data.trips.push(trip);
              }
            }
          });
        }
      });

      hashtagMap.forEach(hashtag => results.push(hashtag));

      // Get all trips for trip results - transform the data to match our interface
      const allTrips: Trip[] = [
        ...(locationTrips || []),
        ...(hashtagTrips || [])
      ]
      .filter((trip, index, self) => 
        index === self.findIndex(t => t.id === trip.id)
      )
      .map(trip => ({
        id: trip.id,
        title: trip.title,
        duration: trip.duration,
        distance: trip.distance,
        stops: trip.stops,
        photo_count: trip.photo_count,
        hashtags: trip.hashtags || [],
        user_id: trip.user_id,
        profiles: Array.isArray(trip.profiles) && trip.profiles.length > 0 
          ? trip.profiles[0] 
          : null
      }));

      setSearchResults(results);
      setTrips(allTrips);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Search Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Search</h1>
            <p className="text-muted-foreground">Find users, locations, or hashtags</p>
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
          {searchQuery && (
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
                          <Card key={result.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {result.type === 'user' ? (
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={result.avatar} />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                      {result.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                    {getIcon(result.type)}
                                  </div>
                                )}
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
                          <TripCard
                            key={trip.id}
                            user={{
                              name: trip.profiles?.name || 'Unknown User',
                              username: trip.profiles?.username || 'unknown',
                              avatar: trip.profiles?.avatar
                            }}
                            trip={{
                              title: trip.title || 'Untitled Trip',
                              duration: trip.duration || '0 hours',
                              distance: trip.distance || '0 km',
                              stops: Array.isArray(trip.stops) ? trip.stops : [],
                              photoCount: trip.photo_count || 0
                            }}
                            stats={{
                              likes: 0,
                              comments: 0
                            }}
                            expandable={true}
                          />
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {!loading && searchQuery && filteredResults.length === 0 && filteredTrips.length === 0 && (
                      <div className="text-center py-8">
                        <SearchIcon size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Try searching for users, locations, or hashtags
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Search Suggestions */}
          {!searchQuery && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Search Suggestions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Users size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Search Users</p>
                        <p className="text-xs text-muted-foreground">Find friends and travelers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                        <MapPin size={16} className="text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Search Locations</p>
                        <p className="text-xs text-muted-foreground">Discover travel destinations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                        <Hash size={16} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Search Hashtags</p>
                        <p className="text-xs text-muted-foreground">Find trips by theme</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Search;