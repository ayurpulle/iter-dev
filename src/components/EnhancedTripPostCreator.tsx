import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, MapPin, Search, X, Plus, Trash2, Users, DollarSign } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from "@/components/ui/carousel";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import PhotoSelector from './PhotoSelector';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTrips } from '@/hooks/useTrips';

interface EnhancedTripPostCreatorProps {
  onBack?: () => void;
}

interface Location {
  id: string;
  name: string;
  type: 'country' | 'city' | 'town' | 'place';
  fullName: string;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
  countryCode?: string;
  flag?: string;
}

interface PhotoDetail {
  url: string;
  caption: string;
  budget: string;
  tagged_friends: string[];
}

const EnhancedTripPostCreator = ({ onBack }: EnhancedTripPostCreatorProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTrip, loading } = useTrips();
  
  // Trip data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [companions, setCompanions] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Location/route data
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [tripRoute, setTripRoute] = useState<Array<{lat: number, lng: number, name: string}>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Photo data
  const [photoDetails, setPhotoDetails] = useState<PhotoDetail[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  
  // Friends data
  const [friends, setFriends] = useState<Array<{username: string, name: string}>>([]);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  
  // Map data
  const [mapboxToken, setMapboxToken] = useState('');
  const [userMapboxToken, setUserMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Try to fetch Mapbox token from Supabase
    const fetchMapboxToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('get-mapbox-token', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
        });
        
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setShowTokenInput(true);
        }
      } catch (err) {
        setShowTokenInput(true);
      }
    };

    // Load friends list
    const loadFriends = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: friendsData } = await supabase
          .from('friends')
          .select(`
            friend_id
          `)
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (friendsData) {
          // Get profile data separately
          const friendIds = friendsData.map(f => f.friend_id);
          if (friendIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('user_id, username, name')
              .in('user_id', friendIds);
            
            const formattedFriends = (profilesData || [])
              .filter(p => p.username)
              .map(p => ({
                username: p.username!,
                name: p.name || p.username!
              }));
            setFriends(formattedFriends);
          }
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };

    fetchMapboxToken();
    loadFriends();
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentPhotoIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Convert country code to flag emoji
  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Search locations using Mapbox Geocoding API
  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const token = mapboxToken || userMapboxToken;
    if (!token) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=country,place,locality&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        const locations: Location[] = data.features.map((feature: any) => {
          const placeType = feature.place_type[0];
          let type: Location['type'] = 'place';
          
          if (placeType === 'country') type = 'country';
          else if (placeType === 'place' || placeType === 'locality') type = 'city';
          else if (placeType === 'region') type = 'place';

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
            bbox: feature.bbox as [number, number, number, number] | undefined,
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
  }, [searchQuery, mapboxToken, userMapboxToken]);

  const handlePhotosSelected = (photos: string[]) => {
    const newPhotoDetails: PhotoDetail[] = photos.map((url, index) => ({
      url,
      caption: '',
      budget: '',
      tagged_friends: []
    }));
    setPhotoDetails(newPhotoDetails);
    setCurrentPhotoIndex(0);
    setShowPhotoSelector(false);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 9 - photoDetails.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setPhotoDetails(prev => [
            ...prev,
            {
              url: dataUrl,
              caption: '',
              budget: '',
              tagged_friends: []
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const handleLocationSelect = (location: Location) => {
    if (!selectedLocations.find(loc => loc.id === location.id)) {
      setSelectedLocations(prev => [...prev, location]);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const removeLocation = (locationId: string) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const updatePhotoDetail = (index: number, field: keyof PhotoDetail, value: any) => {
    setPhotoDetails(prev => prev.map((photo, i) => 
      i === index ? { ...photo, [field]: value } : photo
    ));
  };

  const addTaggedFriend = (photoIndex: number, username: string) => {
    updatePhotoDetail(photoIndex, 'tagged_friends', [
      ...photoDetails[photoIndex].tagged_friends,
      username
    ]);
    setTagSearchQuery('');
    setTagSearchOpen(false);
  };

  const removeTaggedFriend = (photoIndex: number, username: string) => {
    updatePhotoDetail(photoIndex, 'tagged_friends', 
      photoDetails[photoIndex].tagged_friends.filter(f => f !== username)
    );
  };

  const getBudgetLevel = (budget: string): number => {
    return budget.length; // $ = 1, $$ = 2, $$$ = 3, etc.
  };

  const getBudgetLabel = (budget: string): string => {
    const labels = {
      '$': 'Budget-friendly',
      '$$': 'Moderate',
      '$$$': 'Expensive',
      '$$$$': 'Luxury',
      '$$$$$': 'Ultra-luxury'
    };
    return labels[budget as keyof typeof labels] || '';
  };

  const removePhoto = (index: number) => {
    setPhotoDetails(prev => prev.filter((_, i) => i !== index));
    if (currentPhotoIndex >= photoDetails.length - 1 && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || selectedLocations.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select at least one location",
        variant: "destructive",
      });
      return;
    }

    try {
      const route = selectedLocations.map(loc => ({
        lat: loc.coordinates[1],
        lng: loc.coordinates[0],
        name: loc.name
      }));

      // Extract only photo URLs for legacy compatibility
      const photoUrls = photoDetails.map(detail => detail.url);

      const tripData = {
        title,
        description,
        country_code: selectedLocations[0]?.countryCode || '',
        companions,
        duration,
        distance: '', // Could calculate this from route
        route,
        photos: photoUrls,
        is_public: isPublic,
        photo_details: photoDetails // New detailed photo data
      };

      await createTrip(tripData);
      
      toast({
        title: "Success",
        description: "Trip created successfully!",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: "Error",
        description: "Failed to create trip",
        variant: "destructive",
      });
    }
  };

  const currentPhoto = photoDetails[currentPhotoIndex];
  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack || (() => navigate(-1))}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-lg font-semibold">Create Trip Post</h1>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !title.trim() || selectedLocations.length === 0}
          className="bg-primary text-primary-foreground"
        >
          {loading ? 'Creating...' : 'Post Trip'}
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Trip Info */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="title">Trip Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter trip title..."
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your trip..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 5 days"
                />
              </div>
              <div>
                <Label htmlFor="companions">Companions</Label>
                <Input
                  id="companions"
                  value={companions}
                  onChange={(e) => setCompanions(e.target.value)}
                  placeholder="e.g., Family"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Selection */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <Label>Trip Locations</Label>
            
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={16} className="mr-2" />
                  Add location...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-background border shadow-lg z-50">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search locations..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {isSearching && (
                      <div className="p-2 text-sm text-muted-foreground">Searching...</div>
                    )}
                    {!isSearching && searchResults.length === 0 && searchQuery && (
                      <CommandEmpty>No locations found.</CommandEmpty>
                    )}
                    <CommandGroup>
                      {searchResults.map((location) => (
                        <CommandItem
                          key={location.id}
                          onSelect={() => handleLocationSelect(location)}
                          className="flex items-center gap-2"
                        >
                          <span>{location.flag}</span>
                          <div className="flex flex-col">
                            <span>{location.name}</span>
                            <span className="text-xs text-muted-foreground">{location.fullName}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map((location) => (
                  <Badge key={location.id} variant="secondary" className="flex items-center gap-1">
                    <span>{location.flag}</span>
                    <span>{location.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(location.id)}
                      className="h-auto p-0 ml-1"
                    >
                      <X size={12} />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Management */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Trip Photos (Max 9)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoSelector(true)}
                disabled={photoDetails.length >= 9}
              >
                <Plus size={16} className="mr-1" />
                Add Photos
              </Button>
            </div>

            {photoDetails.length > 0 && (
              <div className="space-y-4">
                {/* Photo Carousel */}
                <Carousel className="w-full" setApi={setCarouselApi}>
                  <CarouselContent>
                    {photoDetails.map((photo, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                          <img 
                            src={photo.url} 
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {photoDetails.length > 1 && (
                    <>
                      <CarouselPrevious />
                      <CarouselNext />
                    </>
                  )}
                </Carousel>

                {/* Photo Details Form */}
                {currentPhoto && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium">Photo {currentPhotoIndex + 1} Details</h4>
                    
                    <div>
                      <Label htmlFor={`caption-${currentPhotoIndex}`}>Caption</Label>
                      <Textarea
                        id={`caption-${currentPhotoIndex}`}
                        value={currentPhoto.caption}
                        onChange={(e) => updatePhotoDetail(currentPhotoIndex, 'caption', e.target.value)}
                        placeholder="What's happening in this photo?"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`budget-${currentPhotoIndex}`}>Budget</Label>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Button
                            key={level}
                            variant={getBudgetLevel(currentPhoto.budget) >= level ? "default" : "outline"}
                            size="sm"
                            onClick={() => updatePhotoDetail(currentPhotoIndex, 'budget', '$'.repeat(level))}
                            className="h-8 px-2"
                          >
                            $
                          </Button>
                        ))}
                        {currentPhoto.budget && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updatePhotoDetail(currentPhotoIndex, 'budget', '')}
                            className="h-8 px-2 ml-2"
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                      {currentPhoto.budget && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getBudgetLabel(currentPhoto.budget)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Tagged Friends</Label>
                      <Popover open={tagSearchOpen} onOpenChange={setTagSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={() => setTagSearchOpen(true)}
                          >
                            <Users size={16} className="mr-2" />
                            Tag friends...
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 bg-background border shadow-lg z-50">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search friends..."
                              value={tagSearchQuery}
                              onValueChange={setTagSearchQuery}
                            />
                            <CommandList>
                              <CommandGroup>
                                {filteredFriends
                                  .filter(friend => !currentPhoto.tagged_friends.includes(friend.username))
                                  .map((friend) => (
                                  <CommandItem
                                    key={friend.username}
                                    onSelect={() => addTaggedFriend(currentPhotoIndex, friend.username)}
                                  >
                                    <span>{friend.name} (@{friend.username})</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {currentPhoto.tagged_friends.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentPhoto.tagged_friends.map((username) => {
                            const friend = friends.find(f => f.username === username);
                            return (
                              <Badge key={username} variant="secondary" className="flex items-center gap-1">
                                <span>@{username}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTaggedFriend(currentPhotoIndex, username)}
                                  className="h-auto p-0 ml-1"
                                >
                                  <X size={12} />
                                </Button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photo Selector Modal */}
      {showPhotoSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Select Photos</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPhotoSelector(false)}>
                  <X size={16} />
                </Button>
              </div>
              
              {/* Web-friendly photo input */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {photoDetails.map((photo, index) => (
                    <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {photoDetails.length < 9 && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                      id="photo-input"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('photo-input')?.click()}
                      className="w-full"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Photos ({photoDetails.length}/9)
                    </Button>
                  </div>
                )}
                
                <Button 
                  onClick={() => setShowPhotoSelector(false)}
                  className="w-full"
                  disabled={photoDetails.length === 0}
                >
                  Done
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Mapbox Token Input */}
      {showTokenInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Mapbox Token Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please enter your Mapbox public token to enable location search and maps.
              </p>
              <Input
                value={userMapboxToken}
                onChange={(e) => setUserMapboxToken(e.target.value)}
                placeholder="pk.eyJ1..."
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTokenInput(false)}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button
                  onClick={() => setShowTokenInput(false)}
                  disabled={!userMapboxToken}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EnhancedTripPostCreator;