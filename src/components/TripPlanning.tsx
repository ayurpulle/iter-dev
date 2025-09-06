import { useState } from "react";
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
import { MapPin, Calendar, Heart, Users, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSavedPosts } from "@/hooks/useSavedPosts";

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

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [whereDialogOpen, setWhereDialogOpen] = useState(false);
  const [whenDialogOpen, setWhenDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  
  const { savedPosts } = useSavedPosts();

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

  const handleGenerate = () => {
    // Mock generation
    setGeneratedPlan({
      map: "Mock Map",
      time: "3 days",
      distance: "200km",
      itinerary: ["Day 1: ...", "Day 2: ..."],
    });
  };

  if (generatedPlan) {
    return (
      <div>
        <h2>Plan Your Trip</h2>
        <div className="h-40 bg-muted">{generatedPlan.map}</div>
        <p>Time: {generatedPlan.time}</p>
        <p>Distance: {generatedPlan.distance}</p>
        <h3>Itinerary:</h3>
        {generatedPlan.itinerary.map((item, idx) => <p key={idx}>{item}</p>)}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
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

        {/* Generate Iter Button */}
        <Button className="w-full h-12 text-lg" onClick={handleGenerate}>
          Generate Iter
        </Button>
      </div>
    </div>
  );
};

export default TripPlanning;