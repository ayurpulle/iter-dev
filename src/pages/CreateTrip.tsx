import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Upload, MapPin, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateTrip = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cities, setCities] = useState<string[]>([]);
  const [currentCity, setCurrentCity] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [tripTitle, setTripTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const addCity = () => {
    if (currentCity.trim() && !cities.includes(currentCity.trim())) {
      setCities([...cities, currentCity.trim()]);
      setCurrentCity("");
    }
  };

  const removeCity = (cityToRemove: string) => {
    setCities(cities.filter(city => city !== cityToRemove));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).slice(0, 10 - photos.length); // Limit to 10 photos
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const mockLLMProcessing = async () => {
    setIsProcessing(true);
    
    // Simulate API processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock LLM response - simulating journey analysis
    const mockJourney = {
      title: tripTitle || `Journey through ${cities.join(", ")}`,
      duration: `${Math.floor(Math.random() * 10) + 1} days`,
      distance: `${Math.floor(Math.random() * 2000) + 100}km`,
      stops: cities.map((city, index) => ({
        name: city,
        order: index + 1,
        // Mock coordinates (in real app, LLM would geocode these)
        lat: 40 + Math.random() * 20,
        lng: -10 + Math.random() * 40,
        photos: photos.slice(index * 2, (index + 1) * 2), // Distribute photos among cities
      })),
      highlights: [
        "Amazing local cuisine",
        "Historic architecture",
        "Beautiful landscapes",
        "Cultural experiences"
      ],
      description: `An incredible journey through ${cities.length} cities, capturing ${photos.length} memorable moments along the way.`
    };

    setIsProcessing(false);
    
    toast({
      title: "Trip Posted Successfully!",
      description: "Your journey has been processed and added to your timeline.",
    });

    // Navigate back to home with the new trip (in real app, this would be saved to database)
    navigate("/");
  };

  const handleSubmit = () => {
    if (cities.length === 0) {
      toast({
        title: "Add some cities",
        description: "Please add at least one city to your journey.",
        variant: "destructive",
      });
      return;
    }

    if (photos.length === 0) {
      toast({
        title: "Add some photos",
        description: "Please upload at least one photo from your trip.",
        variant: "destructive",
      });
      return;
    }

    mockLLMProcessing();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-lg font-semibold">Post Trip</h1>
          <div className="w-8" />
        </div>
      </div>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Trip Title */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Trip Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Summer Adventure in Europe"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cities Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin size={20} />
              Cities Visited
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter a city name"
                value={currentCity}
                onChange={(e) => setCurrentCity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCity()}
              />
              <Button onClick={addCity} size="sm">
                Add
              </Button>
            </div>
            
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cities.map((city, index) => (
                  <Badge key={city} variant="secondary" className="flex items-center gap-1">
                    {index + 1}. {city}
                    <X 
                      size={14} 
                      className="cursor-pointer hover:text-destructive" 
                      onClick={() => removeCity(city)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera size={20} />
              Trip Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <Upload size={40} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload photos (up to 10)
                </p>
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          className="w-full h-12 text-lg"
          disabled={isProcessing}
        >
          {isProcessing ? "Processing Your Journey..." : "Post Trip"}
        </Button>

        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-muted-foreground">
                  Our AI is analyzing your photos and creating your journey map...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CreateTrip;