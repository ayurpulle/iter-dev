import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, MapPin, Route, Search, X, Plus } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface TripPostCreatorProps {
  onBack?: () => void;
}

interface Location {
  id: string;
  name: string;
  type: 'country' | 'city' | 'town' | 'place';
  fullName: string;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
}

const TripPostCreator = ({ onBack }: TripPostCreatorProps) => {
  const navigate = useNavigate();
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isSelectingPhoto, setIsSelectingPhoto] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [userMapboxToken, setUserMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tripRoute, setTripRoute] = useState<Array<{lat: number, lng: number, name: string}>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Try to fetch Mapbox token from Supabase
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setShowTokenInput(true);
        }
      } catch (err) {
        setShowTokenInput(true);
      }
    };

    fetchMapboxToken();
  }, []);

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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=country,region,place,locality&limit=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        const locations: Location[] = data.features.map((feature: any) => {
          const placeType = feature.place_type[0];
          let type: Location['type'] = 'place';
          
          if (placeType === 'country') type = 'country';
          else if (placeType === 'place' || placeType === 'locality') type = 'city';
          else if (placeType === 'region') type = 'place';

          return {
            id: feature.id,
            name: feature.text,
            fullName: feature.place_name,
            type,
            coordinates: feature.center as [number, number],
            bbox: feature.bbox as [number, number, number, number] | undefined,
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

  useEffect(() => {
    const token = mapboxToken || userMapboxToken;
    if (!mapContainer.current || !token || selectedLocations.length === 0) return;

    mapboxgl.accessToken = token;

    // Calculate center based on selected locations
    const avgLng = selectedLocations.reduce((sum, loc) => sum + loc.coordinates[0], 0) / selectedLocations.length;
    const avgLat = selectedLocations.reduce((sum, loc) => sum + loc.coordinates[1], 0) / selectedLocations.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [avgLng, avgLat],
      zoom: selectedLocations.length > 1 ? 4 : 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Store markers in a ref to track them
    const markers: mapboxgl.Marker[] = [];

    // Allow clicking to add route points
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      setTripRoute(currentRoute => {
        const newPoint = {
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          name: `Stop ${currentRoute.length + 1}`
        };
        
        const newRoute = [...currentRoute, newPoint];

        // Add marker
        const marker = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map.current!);
        
        markers.push(marker);

        // Draw route if we have multiple points
        if (newRoute.length > 1) {
          const coordinates = newRoute.map(point => [point.lng, point.lat]);
          
          if (map.current!.getSource('route')) {
            (map.current!.getSource('route') as mapboxgl.GeoJSONSource).setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            });
          } else {
            map.current!.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              }
            });

            map.current!.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#3b82f6',
                'line-width': 3
              }
            });
          }
        }

        return newRoute;
      });
    };

    map.current.on('click', handleMapClick);

      return () => {
      // Clean up markers
      markers.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [selectedLocations, mapboxToken, userMapboxToken]);

  const selectPhoto = async () => {
    try {
      setIsSelectingPhoto(true);
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (photo.dataUrl) {
        setSelectedPhotos(prev => [...prev, photo.dataUrl]);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
    } finally {
      setIsSelectingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addLocation = (location: Location) => {
    if (!selectedLocations.find(loc => loc.id === location.id)) {
      setSelectedLocations(prev => [...prev, location]);
    }
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeLocation = (locationId: string) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const handleNext = () => {
    if (selectedLocations.length === 0) {
      alert('Please select at least one location first');
      return;
    }
    
    // Navigate to trip details page with current data
    const tripData = {
      locations: selectedLocations,
      photos: selectedPhotos,
      route: tripRoute
    };
    
    navigate('/trip-details', { state: tripData });
  };

  const handleSkipPhotos = () => {
    setSelectedPhotos([]);
    // Indicate photos were skipped
    console.log('Photos skipped');
  };

  const handleGenerateTripMap = () => {
    if (selectedLocations.length === 0) {
      alert('Please select at least one location first');
      return;
    }
    
    // Generate trip map logic
    const tripData = {
      locations: selectedLocations,
      photos: selectedPhotos,
      route: tripRoute
    };
    
    console.log('Generating trip map for:', tripData);
    const locationNames = selectedLocations.map(loc => loc.name).join(', ');
    alert(`Generating trip map for ${locationNames} with ${tripRoute.length} stops and ${selectedPhotos.length} photos`);
    
    // Here you could navigate to a trip preview/generation page
    // or show a modal with the generated trip
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        
        <h1 className="font-semibold">Trip Post</h1>
        
        <Button
          size="sm"
          onClick={handleNext}
          disabled={selectedLocations.length === 0}
        >
          Next
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Location Selection */}
        <div className="space-y-3">
          <Label>Destinations</Label>
          
          {/* Selected Locations */}
          {selectedLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedLocations.map((location) => (
                <Badge key={location.id} variant="secondary" className="gap-1">
                  <span className="text-xs opacity-60">
                    {location.type === 'country' ? '🏳️' : location.type === 'city' ? '🏙️' : '🏘️'}
                  </span>
                  {location.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeLocation(location.id)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Search Input */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="text-muted-foreground">
                  {isSearching ? 'Searching...' : 'Search destinations worldwide...'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search destinations..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  {searchQuery.length < 2 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Type at least 2 characters to search worldwide destinations
                    </div>
                  ) : isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <CommandEmpty>No destinations found.</CommandEmpty>
                  ) : (
                    <CommandGroup heading="Search Results">
                      {searchResults.map((location) => (
                        <CommandItem
                          key={location.id}
                          onSelect={() => addLocation(location)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span>
                              {location.type === 'country' ? '🏳️' : 
                               location.type === 'city' ? '🏙️' : 
                               location.type === 'place' ? '📍' : '🏘️'}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium">{location.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {location.fullName}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mapbox Token Input (if needed) */}
        {showTokenInput && !mapboxToken && (
          <Card className="p-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="mapbox-token">Mapbox Token</Label>
              <p className="text-xs text-muted-foreground">
                Get your token from <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
              </p>
            </div>
            <Input
              id="mapbox-token"
              placeholder="Paste your Mapbox public token here"
              value={userMapboxToken}
              onChange={(e) => setUserMapboxToken(e.target.value)}
            />
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
          {/* Map Section */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b flex items-center gap-2">
              <Route className="h-4 w-4" />
              <span className="text-sm font-medium">Trip Route</span>
              {tripRoute.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTripRoute([]);
                    if (map.current) {
                      // Clear markers and route
                      const markers = document.querySelectorAll('.mapboxgl-marker');
                      markers.forEach(marker => marker.remove());
                      
                      if (map.current.getSource('route')) {
                        map.current.removeLayer('route');
                        map.current.removeSource('route');
                      }
                    }
                  }}
                  className="ml-auto text-xs"
                >
                  Clear Route
                </Button>
              )}
            </div>
            <div className="relative h-80">
              {selectedLocations.length > 0 && (mapboxToken || userMapboxToken) ? (
                <>
                  <div ref={mapContainer} className="absolute inset-0" />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded p-2 text-xs">
                    Click on map to add route stops
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedLocations.length === 0 ? 'Select destinations to view map' : 'Add Mapbox token to view map'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Photos Section */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Photos</h3>
                {selectedPhotos.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {selectedPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedPhotos.slice(0, 6).map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                        onClick={() => removePhoto(index)}
                      >
                        ×
                      </Button>
                      {index === 0 && (
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {selectedPhotos.length < 6 && (
                    <Button
                      variant="outline"
                      className="aspect-square border-dashed"
                      onClick={selectPhoto}
                      disabled={isSelectingPhoto}
                    >
                      +
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={selectPhoto}
                    disabled={isSelectingPhoto}
                    className="w-full"
                  >
                    {isSelectingPhoto ? 'Selecting...' : 'Add Photos'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleSkipPhotos}
                  >
                    Skip Photos
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Generate Trip Map Button */}
        <Card className="p-4">
          <Button
            className="w-full"
            disabled={selectedLocations.length === 0}
            onClick={handleGenerateTripMap}
          >
            Generate Trip Map
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default TripPostCreator;