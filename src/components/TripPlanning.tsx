import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Heart, Users, Search, ChevronDown, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CountryMap from "./CountryMap";
import InteractiveItinerary from "./InteractiveItinerary";
// import SavedTripsView from "./SavedTripsView";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";

const TripPlanning = () => {
  console.log('TripPlanning component loaded');
  const [formData, setFormData] = useState({
    destination: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    holidayTypes: [] as string[],
    budget: 0, // 0 = not set, 1-5 = $ signs
    inspirationSource: "none" as "none" | "all" | "folder" | "search",
    inspirationFolder: "",
    notes: ""
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dateSelectionStep, setDateSelectionStep] = useState<'start' | 'end' | null>(null);

  const [generatedItinerary, setGeneratedItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastGeneratedData, setLastGeneratedData] = useState<any>(null);
  const [friendRecommendations, setFriendRecommendations] = useState<{ [key: string]: any[] }>({});
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [whereDialogOpen, setWhereDialogOpen] = useState(false);
  const [whenDialogOpen, setWhenDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  // View state management
  const [currentView, setCurrentView] = useState<'planning' | 'savedTrips' | 'viewItinerary'>('planning');
  const [viewingItinerary, setViewingItinerary] = useState<any>(null);
  
  const { savedPosts } = useSavedPosts();
  const { toast } = useToast();
  // const { saveItinerary } = useSavedItineraries();
  const saveItinerary = async (data: any) => {
    console.log('Save itinerary placeholder called with:', data);
    return true;
  };
  
  console.log('TripPlanning state:', { currentView, generatedItinerary, isLoading });

  // Helper function to get flag emoji from country code
  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    return String.fromCodePoint(
      ...[...countryCode.toUpperCase()].map(x => 0x1f1e6 + x.charCodeAt(0) - 65)
    );
  };

  // Search locations using Mapbox API
  const searchLocations = async (query: string) => {
    if (!query.trim() || !mapboxToken) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=country,place,locality&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        const locations = data.features.map((feature: any) => {
          const placeType = feature.place_type[0];
          let type: 'country' | 'city' | 'place' = 'place';
          
          if (placeType === 'country') type = 'country';
          else if (placeType === 'place' || placeType === 'locality') type = 'city';
          else if (placeType === 'region') type = 'place';

          // Extract country code from context
          let countryCode = '';
          if (type === 'country') {
            countryCode = feature.properties?.short_code || feature.properties?.iso_3166_1_alpha_2 || '';
          } else {
            const countryContext = feature.context?.find((ctx: any) => 
              ctx.id.startsWith('country.')
            );
            countryCode = countryContext?.short_code || '';
          }

          const flag = getFlagEmoji(countryCode);

          return {
            id: feature.id,
            name: feature.text,
            fullName: feature.place_name,
            type,
            coordinates: feature.center as [number, number],
            countryCode,
            flag,
          };
        });
        
        setSearchResults(locations);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocations(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, mapboxToken]);

  // Handle date selection with single calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!formData.startDate || (formData.startDate && formData.endDate)) {
      // First selection or resetting
      setFormData(prev => ({ ...prev, startDate: date, endDate: null }));
      setDateSelectionStep('end');
    } else if (formData.startDate && !formData.endDate) {
      // Second selection
      if (date < formData.startDate) {
        // If selected date is before start date, make it the new start date
        setFormData(prev => ({ ...prev, startDate: date, endDate: prev.startDate }));
      } else {
        // Normal case - set as end date
        setFormData(prev => ({ ...prev, endDate: date }));
      }
      setDateSelectionStep(null);
    }
  };

  // Fetch Mapbox token on component mount
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.log('Mapbox token not available');
      }
    };
    fetchMapboxToken();
  }, []);

  const holidayTypes = [
    "Adventure & Outdoor",
    "Beach & Relaxation", 
    "City Break",
    "Cultural & Historical",
    "Food & Wine",
    "Romantic Getaway",
    "Family Holiday",
    "Solo Travel",
    "Backpacking",
    "Luxury & Spa"
  ];

  const toggleHolidayType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      holidayTypes: prev.holidayTypes.includes(type)
        ? prev.holidayTypes.filter(t => t !== type)
        : [...prev.holidayTypes, type]
    }));
  };

  const getBudgetDisplay = (budget: number) => {
    if (budget === 0) return "Select budget";
    return "$".repeat(budget);
  };

  const getBudgetDescription = (budget: number) => {
    const descriptions = {
      0: "",
      1: "Budget-friendly",
      2: "Moderate", 
      3: "Comfortable",
      4: "Luxury",
      5: "Ultra-luxury"
    };
    return descriptions[budget as keyof typeof descriptions] || "";
  };

  const generateItinerary = async () => {
    if (!formData.destination) {
      toast({
        title: "Missing Information",
        description: "Please enter a destination to generate an itinerary.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          destination: formData.destination,
          startDate: formData.startDate?.toISOString(),
          endDate: formData.endDate?.toISOString(),
          budget: formData.budget > 0 ? formData.budget : null,
          interests: formData.holidayTypes.join(', '),
          travelStyle: formData.notes
        }
      });

      if (error) {
        console.error('Error generating itinerary:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate itinerary. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Store the generated data and show success dialog
      setLastGeneratedData(data);
      setFriendRecommendations(data.friendRecommendations || {});
      setShowSuccessDialog(true);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Generation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewItinerary = () => {
    if (lastGeneratedData) {
      setGeneratedItinerary(lastGeneratedData.itinerary);
      setShowSuccessDialog(false);
    }
  };

  // Extract route stops from destination using better coordinate lookup
  const getRouteStops = (destination: string) => {
    // Expanded destination coordinates database
    const destinationCoords: { [key: string]: { lat: number; lng: number } } = {
      // US Cities
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'seattle': { lat: 47.6062, lng: -122.3321 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'las vegas': { lat: 36.1699, lng: -115.1398 },
      
      // European Cities
      'paris': { lat: 48.8566, lng: 2.3522 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
      'madrid': { lat: 40.4168, lng: -3.7038 },
      'vienna': { lat: 48.2082, lng: 16.3738 },
      
      // Asian Cities  
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'kyoto': { lat: 35.0116, lng: 135.7681 },
      'seoul': { lat: 37.5665, lng: 126.9780 },
      'bangkok': { lat: 13.7563, lng: 100.5018 },
      'singapore': { lat: 1.3521, lng: 103.8198 },
      
      // Other Popular Destinations
      'sydney': { lat: -33.8688, lng: 151.2093 },
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'istanbul': { lat: 41.0082, lng: 28.9784 },
    };
    
    const dest = destination.toLowerCase();
    
    // Try exact match first
    if (destinationCoords[dest]) {
      const baseCoord = destinationCoords[dest];
      return [
        { name: `${destination} - Arrival`, lat: baseCoord.lat - 0.01, lng: baseCoord.lng - 0.01 },
        { name: `${destination} - Downtown`, lat: baseCoord.lat, lng: baseCoord.lng },
        { name: `${destination} - Departure`, lat: baseCoord.lat + 0.01, lng: baseCoord.lng + 0.01 },
      ];
    }
    
    // Try partial match
    const partialMatch = Object.keys(destinationCoords).find(key => 
      dest.includes(key) || key.includes(dest.split(',')[0].trim())
    );
    
    if (partialMatch && destinationCoords[partialMatch]) {
      const baseCoord = destinationCoords[partialMatch];
      return [
        { name: `${destination} - Start`, lat: baseCoord.lat - 0.01, lng: baseCoord.lng - 0.01 },
        { name: `${destination} - Center`, lat: baseCoord.lat, lng: baseCoord.lng },
        { name: `${destination} - End`, lat: baseCoord.lat + 0.01, lng: baseCoord.lng + 0.01 },
      ];
    }
    
    // Default to San Francisco if no match found (better than Paris)
    return [
      { name: 'Default Location - Start', lat: 37.7749, lng: -122.4194 },
      { name: 'Default Location - Center', lat: 37.7849, lng: -122.4094 },
      { name: 'Default Location - End', lat: 37.7949, lng: -122.3994 },
    ];
  };

  // Handle different view states
  if (currentView === 'savedTrips') {
    return (
      <div className="px-4 py-6 pb-24 max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Saved Trips Coming Soon</h1>
          <Button onClick={() => setCurrentView('planning')} className="mt-4">
            Back to Planning
          </Button>
        </div>
      </div>
    );
  }

  if (currentView === 'viewItinerary' && viewingItinerary) {
    return (
      <div className="px-4 py-6 pb-24 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('savedTrips')}
              className="p-1"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{viewingItinerary.title}</h1>
              <p className="text-muted-foreground">{viewingItinerary.destination}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <InteractiveItinerary 
                itinerary={viewingItinerary.itinerary_content}
                friendRecommendations={viewingItinerary.friend_recommendations || {}}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (generatedItinerary) {
    const routeStops = getRouteStops(lastGeneratedData?.destination || formData.destination || 'Paris');
    const duration = formData.endDate && formData.startDate 
      ? Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 3;
    
    return (
      <div className="px-4 py-6 pb-24 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGeneratedItinerary(null)}
              className="p-1"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Itinerary</h1>
              <p className="text-muted-foreground">{lastGeneratedData?.destination || formData.destination}</p>
            </div>
          </div>

          {/* Map Section */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="h-48 w-full rounded-lg overflow-hidden border">
                  <CountryMap 
                    stops={routeStops}
                    className="h-full w-full"
                    mapboxToken={mapboxToken}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Time: {duration} days</span>
                  <span>Distance: ~200km</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itinerary Text */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">Itinerary:</h3>
            </CardHeader>
            <CardContent className="pt-0">
              <InteractiveItinerary 
                itinerary={generatedItinerary}
                friendRecommendations={friendRecommendations}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1" 
              onClick={() => setGeneratedItinerary(null)}
            >
              Create Another
            </Button>
            <Button 
              className="flex-1"
              onClick={async () => {
                const saved = await saveItinerary({
                  title: `${lastGeneratedData?.destination || formData.destination} Trip`,
                  destination: lastGeneratedData?.destination || formData.destination,
                  start_date: formData.startDate,
                  end_date: formData.endDate,
                  budget: formData.budget,
                  interests: formData.holidayTypes,
                  itinerary_content: generatedItinerary,
                  friend_recommendations: friendRecommendations
                });
              }}
            >
              Save Itinerary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-md mx-auto">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Plan Your Trip</h1>
          <p className="text-muted-foreground">Tell us about your dream getaway</p>
        </div>

        {/* Where */}
        <Dialog open={whereDialogOpen} onOpenChange={setWhereDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin size={20} className="text-primary" />
                    <div>
                      <p className="font-medium text-sm">Where</p>
                      <p className="text-muted-foreground text-sm">
                        {formData.destination || "Search destinations"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Where to?</DialogTitle>
              <DialogDescription>Search and select your destination</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search countries, cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 size={16} className="absolute right-3 top-3 text-muted-foreground animate-spin" />
                )}
              </div>
              
              {searchQuery && searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-1">
                    {searchResults.map((location) => (
                      <div
                        key={location.id}
                        className="p-3 hover:bg-muted rounded cursor-pointer transition-colors"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, destination: location.fullName }));
                          setWhereDialogOpen(false);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{location.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{location.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{location.fullName}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {location.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No locations found</p>
                </div>
              )}
              
              {!searchQuery && (
                <div>
                  <p className="text-sm font-medium mb-2">Popular destinations</p>
                  <div className="space-y-1">
                    {["Tokyo, Japan", "Paris, France", "New York, USA", "London, UK", "Rome, Italy"].map((location) => (
                      <div
                        key={location}
                        className="p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, destination: location }));
                          setWhereDialogOpen(false);
                        }}
                      >
                        <p className="text-sm">{location}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* When */}
        <Dialog open={whenDialogOpen} onOpenChange={setWhenDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-primary" />
                    <div>
                      <p className="font-medium text-sm">When</p>
                      <p className="text-muted-foreground text-sm">
                        {formData.startDate && formData.endDate 
                          ? `${format(formData.startDate, "MMM d")} - ${format(formData.endDate, "MMM d")}`
                          : formData.startDate 
                          ? `${format(formData.startDate, "MMM d")} - Select end date`
                          : "Select dates"
                        }
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>When's your trip?</DialogTitle>
              <DialogDescription>
                {!formData.startDate 
                  ? "Select your start date" 
                  : !formData.endDate 
                  ? "Now select your end date"
                  : "Your trip dates"
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <CalendarComponent
                mode="single"
                selected={formData.endDate || formData.startDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date()}
                initialFocus
                className="pointer-events-auto rounded-md border w-full"
              />
              
              {formData.startDate && formData.endDate && (
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {format(formData.startDate, "MMM d")} - {format(formData.endDate, "MMM d")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-2" 
                    onClick={() => setWhenDialogOpen(false)}
                  >
                    Confirm Dates
                  </Button>
                </div>
              )}
              
              {formData.startDate && !formData.endDate && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Start: {format(formData.startDate, "MMM d, yyyy")}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2" 
                    onClick={() => setFormData(prev => ({ ...prev, startDate: null, endDate: null }))}
                  >
                    Reset Dates
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Budget - Inline selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart size={20} className="text-primary" />
                <div>
                  <p className="font-medium text-sm">Budget</p>
                  <p className="text-muted-foreground text-sm">
                    {getBudgetDescription(formData.budget) || "Select budget level"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    variant={formData.budget >= level ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0 text-xs"
                    onClick={() => setFormData(prev => ({ ...prev, budget: level }))}
                  >
                    $
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Type of Holiday */}
        <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart size={20} className="text-primary" />
                    <div>
                      <p className="font-medium text-sm">Type of Holiday</p>
                      <p className="text-muted-foreground text-sm">
                        {formData.holidayTypes.length > 0 
                          ? `${formData.holidayTypes.length} selected`
                          : "Select trip types"
                        }
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>What type of trip?</DialogTitle>
              <DialogDescription>Choose your holiday types</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {holidayTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={formData.holidayTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer justify-center p-2 h-auto text-center"
                    onClick={() => toggleHolidayType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              {formData.holidayTypes.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    Selected: {formData.holidayTypes.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Take Inspiration */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-primary" />
                <div>
                  <p className="font-medium text-sm">Take Inspiration</p>
                  <p className="text-muted-foreground text-sm">
                    {formData.inspirationSource === "none" ? "Not using inspiration" :
                     formData.inspirationSource === "all" ? "From all saved posts" :
                     formData.inspirationSource === "folder" ? `From ${formData.inspirationFolder || "selected folder"}` :
                     "From search results"}
                  </p>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ChevronDown size={16} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <div
                      className="p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, inspirationSource: "none" }))}
                    >
                      <p className="text-sm font-medium">No inspiration</p>
                      <p className="text-xs text-muted-foreground">Plan from scratch</p>
                    </div>
                    <div
                      className="p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, inspirationSource: "all" }))}
                    >
                      <p className="text-sm font-medium">All saved posts</p>
                      <p className="text-xs text-muted-foreground">From your entire collection</p>
                    </div>
                    <div
                      className="p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, inspirationSource: "folder" }))}
                    >
                      <p className="text-sm font-medium">Specific folder</p>
                      <p className="text-xs text-muted-foreground">From a saved folder</p>
                    </div>
                    <div
                      className="p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, inspirationSource: "search" }))}
                    >
                      <p className="text-sm font-medium">Search posts</p>
                      <p className="text-xs text-muted-foreground">Find specific content</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {formData.inspirationSource === "folder" && (
              <div className="mt-3">
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, inspirationFolder: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="europe-2024">Europe 2024</SelectItem>
                    <SelectItem value="asia-adventures">Asia Adventures</SelectItem>
                    <SelectItem value="beach-destinations">Beach Destinations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="notes">Anything else you'd like to add?</Label>
              <Textarea
                id="notes"
                placeholder="Special requirements, budget considerations, activities..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Generate Itinerary Button */}
        <Button 
          className="w-full h-12 text-lg" 
          onClick={generateItinerary}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Itinerary'
          )}
         </Button>

        {/* Show Saved Trips Button */}
        <Button 
          variant="outline"
          className="w-full" 
          onClick={() => setCurrentView('savedTrips')}
        >
          Show Saved Trips
        </Button>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">🎉 Itinerary Created!</DialogTitle>
              <DialogDescription className="text-center">
                Your custom itinerary for {lastGeneratedData?.destination} is ready
                {lastGeneratedData?.postsUsed > 0 && (
                  <span className="block mt-1 text-xs">
                    Generated using {lastGeneratedData.postsUsed} saved travel posts
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                onClick={handleViewItinerary}
                className="w-full"
              >
                View Itinerary
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSuccessDialog(false)}
                className="w-full"
              >
                Create Another
         </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TripPlanning;