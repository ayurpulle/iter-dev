import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MapPin, Calendar, Heart, Users } from "lucide-react";

const TripPlanning = () => {
  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    holidayType: "",
    inspireFromFriends: false,
    notes: ""
  });

  const [generatedPlan, setGeneratedPlan] = useState(null); // For plan view
  const [selectedTypes, setSelectedTypes] = useState([]);

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

  const mockSuggestions = ["Colombia", "Guatemala"];

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin size={20} className="text-primary" />
              Where
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g., Tokyo, Japan"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* When */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar size={20} className="text-primary" />
              When
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Type of Holiday */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart size={20} className="text-primary" />
              Type of Holiday
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="holiday-type">What kind of trip are you planning?</Label>
              <Input
                id="holiday-type"
                placeholder="e.g., Adventure, Beach, Cultural, Food & Wine..."
                value={formData.holidayType}
                onChange={(e) => setFormData({...formData, holidayType: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Take Inspiration from Friends - Compact */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <Label htmlFor="inspire-friends" className="text-sm font-medium">
                  Get suggestions from friends' trips
                </Label>
              </div>
              <Switch 
                id="inspire-friends"
                checked={formData.inspireFromFriends} 
                onCheckedChange={(checked) => setFormData({...formData, inspireFromFriends: checked})} 
              />
            </div>
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