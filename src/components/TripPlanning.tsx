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

const TripPlanning = () => {
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

  const [generatedItinerary, setGeneratedItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastGeneratedData, setLastGeneratedData] = useState<any>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [whereDialogOpen, setWhereDialogOpen] = useState(false);
  const [whenDialogOpen, setWhenDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  
  const { savedPosts } = useSavedPosts();
  const { toast } = useToast();

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

  const mockSuggestions = ["Colombia", "Guatemala", "Japan", "Italy", "Thailand", "Mexico"];
  const recentSearches = ["Tokyo, Japan", "Paris, France", "New York, USA"];

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

  // Extract route stops from destination (simplified version for demo)
  const getRouteStops = (destination: string) => {
    // This would ideally be parsed from the itinerary content
    // For now, create sample stops based on destination
    const destinationCoords: { [key: string]: { lat: number; lng: number } } = {
      'paris': { lat: 48.8566, lng: 2.3522 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
    };
    
    const dest = destination.toLowerCase();
    const coords = Object.keys(destinationCoords).find(key => dest.includes(key));
    
    if (coords && destinationCoords[coords]) {
      const baseCoord = destinationCoords[coords];
      return [
        { name: `${destination} - Start`, lat: baseCoord.lat - 0.02, lng: baseCoord.lng - 0.02 },
        { name: `${destination} - Center`, lat: baseCoord.lat, lng: baseCoord.lng },
        { name: `${destination} - End`, lat: baseCoord.lat + 0.02, lng: baseCoord.lng + 0.02 },
      ];
    }
    
    // Default to a sample route around Paris
    return [
      { name: 'Start Point', lat: 48.8566, lng: 2.3522 },
      { name: 'Mid Point', lat: 48.8606, lng: 2.3376 },
      { name: 'End Point', lat: 48.8629, lng: 2.3445 },
    ];
  };

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
              <div className="prose prose-sm max-w-none text-foreground">
                {generatedItinerary.split('\n').map((line, idx) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={idx} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={idx} className="text-lg font-semibold mt-3 mb-2">{line.slice(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={idx} className="text-md font-medium mt-2 mb-1">{line.slice(4)}</h3>;
                  } else if (line.startsWith('- ')) {
                    return <p key={idx} className="ml-4 mb-1">• {line.slice(2)}</p>;
                  } else if (line.trim() === '') {
                    return <br key={idx} />;
                  } else {
                    return <p key={idx} className="mb-2">{line}</p>;
                  }
                })}
              </div>
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
              onClick={() => {
                toast({
                  title: "Itinerary Saved!",
                  description: "Added to your saved itineraries.",
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
                  placeholder="Search destinations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchQuery === "" && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">Recent searches</p>
                    <div className="space-y-1">
                      {recentSearches.map((location) => (
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
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Popular destinations</p>
                    <div className="space-y-1">
                      {mockSuggestions.map((location) => (
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
                </>
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
                          : "Add dates"
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
              <DialogDescription>Select your travel dates</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label className="text-sm font-medium">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                      initialFocus
                      disabled={(date) => formData.startDate ? date < formData.startDate : false}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Budget */}
        <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary text-xl">$</div>
                    <div>
                      <p className="font-medium text-sm">Budget</p>
                      <p className="text-muted-foreground text-sm">
                        {getBudgetDisplay(formData.budget)}
                        {formData.budget > 0 && (
                          <span className="ml-2 text-xs">({getBudgetDescription(formData.budget)})</span>
                        )}
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
              <DialogTitle>What's your budget?</DialogTitle>
              <DialogDescription>Select your budget level</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    className={cn(
                      "text-3xl transition-colors hover:scale-110 transform transition-transform",
                      level <= formData.budget ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, budget: level }));
                    }}
                  >
                    $
                  </button>
                ))}
              </div>
              {formData.budget > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {getBudgetDescription(formData.budget)}
                </p>
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