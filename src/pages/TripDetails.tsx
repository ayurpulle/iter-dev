import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, DollarSign, Users, FileText, Star, Loader2 } from 'lucide-react';
import { useTrips } from '@/hooks/useTrips';
import { useToast } from '@/hooks/use-toast';

interface TripData {
  country: string;
  photos: string[];
  route: Array<{lat: number, lng: number, name: string}>;
}

const TripDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createTrip, loading } = useTrips();
  const { toast } = useToast();
  const tripData = location.state as TripData;
  
  const [tripTitle, setTripTitle] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [cost, setCost] = useState('');
  const [companions, setCompanions] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleBack = () => {
    navigate('/create', { state: tripData });
  };

  const handleCreateTrip = async () => {
    if (!tripTitle.trim() || !tripDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the trip title and description.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('=== DEBUG: Creating trip with data ===');
      console.log('tripData from location.state:', tripData);
      console.log('tripData.route:', tripData?.route);
      console.log('tripData.route length:', tripData?.route?.length);

      const newTrip = await createTrip({
        title: tripTitle,
        description: tripDescription,
        country_code: tripData?.country || '',
        cost,
        companions,
        duration,
        distance,
        route: tripData?.route || [],
        photos: tripData?.photos || [],
        is_public: isPublic
      });

      console.log('Trip created successfully:', newTrip);

      toast({
        title: "Trip Created!",
        description: `Your trip "${tripTitle}" has been successfully created.`,
      });

      // Navigate to home or profile
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trip",
        variant: "destructive"
      });
    }
  };

  const costOptions = [
    { value: '$', label: '$', description: 'Budget-friendly' },
    { value: '$$', label: '$$', description: 'Moderate' },
    { value: '$$$', label: '$$$', description: 'Expensive' },
    { value: '$$$$', label: '$$$$', description: 'Luxury' },
    { value: '$$$$$', label: '$$$$$', description: 'Ultra luxury' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="font-semibold">Trip Details</h1>
        
        <Button
          size="sm"
          onClick={handleCreateTrip}
          disabled={!tripTitle.trim() || !tripDescription.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Trip'
          )}
        </Button>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Trip Preview */}
        <Card className="p-4 bg-muted/30">
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Trip Summary
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Country: {tripData?.country || 'Not selected'}</p>
              <p>Photos: {tripData?.photos?.length || 0} selected</p>
              <p>Route stops: {tripData?.route?.length || 0} locations</p>
            </div>
          </div>
        </Card>

        {/* Trip Title */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <Label htmlFor="title" className="font-medium">Trip Title *</Label>
          </div>
          <Input
            id="title"
            placeholder="Give your trip a memorable title..."
            value={tripTitle}
            onChange={(e) => setTripTitle(e.target.value)}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            Make it catchy and descriptive!
          </p>
        </Card>

        {/* Trip Description */}
        <Card className="p-4 space-y-3">
          <Label htmlFor="description" className="font-medium">Trip Description *</Label>
          <Textarea
            id="description"
            placeholder="Tell us about your trip experience, highlights, and memories..."
            value={tripDescription}
            onChange={(e) => setTripDescription(e.target.value)}
            className="min-h-32 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Share what made this trip special and memorable
          </p>
        </Card>

        {/* Cost Level */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <Label className="font-medium">Cost Level</Label>
          </div>
          <Select value={cost} onValueChange={setCost}>
            <SelectTrigger>
              <SelectValue placeholder="Select cost level..." />
            </SelectTrigger>
            <SelectContent>
              {costOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-lg">{option.label}</span>
                    <span className="text-sm text-muted-foreground ml-3">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Help others understand the budget range for this trip
          </p>
        </Card>

        {/* Companions */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Label htmlFor="companions" className="font-medium">Who did you go with?</Label>
          </div>
          <Input
            id="companions"
            placeholder="e.g., Solo, Friends, Family, Partner..."
            value={companions}
            onChange={(e) => setCompanions(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional: Let others know your travel style
          </p>
        </Card>

        {/* Duration and Distance */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <Label htmlFor="duration" className="font-medium">Trip Duration</Label>
            <Input
              id="duration"
              placeholder="e.g., 7 days, 2 weeks"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Card>
          
          <Card className="p-4 space-y-3">
            <Label htmlFor="distance" className="font-medium">Distance Traveled</Label>
            <Input
              id="distance"
              placeholder="e.g., 500km, 1200 miles"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </Card>
        </div>

        {/* Privacy Setting */}
        <Card className="p-4 space-y-3">
          <Label className="font-medium">Privacy Settings</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Make trip public</p>
              <p className="text-xs text-muted-foreground">
                Public trips can be discovered by other users and will appear in the community feed
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </Card>
        {tripData?.photos && tripData.photos.length > 0 && (
          <Card className="p-4 space-y-3">
            <h3 className="font-medium">Selected Photos</h3>
            <div className="grid grid-cols-4 gap-2">
              {tripData.photos.slice(0, 8).map((photo, index) => (
                <div key={index} className="aspect-square">
                  <img
                    src={photo}
                    alt={`Trip photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
              ))}
              {tripData.photos.length > 8 && (
                <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{tripData.photos.length - 8} more
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Create Button */}
        <Card className="p-4">
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateTrip}
            disabled={!tripTitle.trim() || !tripDescription.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Trip...
              </>
            ) : (
              'Create My Trip Post'
            )}
          </Button>
          {(!tripTitle.trim() || !tripDescription.trim()) && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Please fill in the required fields marked with *
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TripDetails;