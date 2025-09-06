import { useState, useEffect } from "react";
import { MapPin, Hash, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Search = () => {
  const [destination, setDestination] = useState("");
  const [selectedWhen, setSelectedWhen] = useState("flexible");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [friendsInspiration, setFriendsInspiration] = useState("no");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for recently saved and recent searches
  const recentlySaved = [
    { name: "Colombia", icon: "🇨🇴" },
    { name: "Guatemala", icon: "🇬🇹" }
  ];

  const recentSearches = [
    { name: "Kyrgyzstan", icon: "🇰🇬" },
    { name: "Albania", icon: "🇦🇱" },
    { name: "Bodra Delhi, India", icon: "🇮🇳" }
  ];

  const tripTypes = [
    "Relaxing", "Beach", "Ski", "Hike", "Adventure", "Culture", "Flexible"
  ];

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerateItinerary = async () => {
    if (!destination.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a destination to generate an itinerary.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // This would integrate with your AI planning functionality
      toast({
        title: "Generating Itinerary",
        description: `Creating a personalized itinerary for ${destination}...`,
      });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Itinerary Generated!",
        description: "Your personalized trip plan is ready.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Where Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Where?</h2>
            
            {/* Search Input */}
            <div className="relative">
              <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search destinations"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Near to you */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-muted-foreground" />
                <h3 className="font-medium text-sm">Near to you</h3>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recently Saved</h4>
                {recentlySaved.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => setDestination(item.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Plane size={16} className="text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Recent Searches</h4>
                {recentSearches.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => setDestination(item.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Plane size={16} className="text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* When Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">When?</h2>
            
            <Tabs value={selectedWhen} onValueChange={setSelectedWhen} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dates">Dates</TabsTrigger>
                <TabsTrigger value="months">Months</TabsTrigger>
                <TabsTrigger value="flexible">Flexible</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dates" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Select specific travel dates</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="months" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Choose preferred months</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="flexible" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">I'm flexible with timing</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Type Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Type?</h2>
            
            <div className="flex flex-wrap gap-2">
              {tripTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedTypes.includes(type) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeToggle(type)}
                  className="text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Friends Inspiration Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Take inspiration from your friends?</h2>
            
            <div className="flex gap-2">
              <Button
                variant={friendsInspiration === "saved" ? "default" : "outline"}
                size="sm"
                onClick={() => setFriendsInspiration("saved")}
                className="flex-1"
              >
                Yes, see saved
              </Button>
              <Button
                variant={friendsInspiration === "search" ? "default" : "outline"}
                size="sm"
                onClick={() => setFriendsInspiration("search")}
                className="flex-1"
              >
                Yes, search for
              </Button>
              <Button
                variant={friendsInspiration === "no" ? "default" : "outline"}
                size="sm"
                onClick={() => setFriendsInspiration("no")}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button 
              onClick={handleGenerateItinerary}
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <Plane className="mr-2 h-5 w-5" />
              {loading ? "Generating..." : "Generate Itiner!"}
            </Button>
          </div>
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
};

export default Search;