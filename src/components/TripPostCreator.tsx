import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, MapPin, Route, Search, X, Plus, Trash2 } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// @ts-ignore
import EXIF from 'exif-js';

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
  countryCode?: string;
  flag?: string;
}

const TripPostCreator = ({ onBack }: TripPostCreatorProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoLocations, setPhotoLocations] = useState<Array<{lat: number, lng: number, name: string, photoIndex: number}>>([]);
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
    console.log('searchLocations called with query:', query);
    
    if (!query.trim() || query.length < 2) {
      console.log('Query too short, clearing results');
      setSearchResults([]);
      return;
    }

    const token = mapboxToken || userMapboxToken;
    if (!token) {
      console.log('No token available');
      setSearchResults([]);
      return;
    }

    console.log('Starting search with token available');
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=country,place,locality&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search API response:', data);
        const locations: Location[] = data.features.map((feature: any) => {
          const placeType = feature.place_type[0];
          let type: Location['type'] = 'place';
          
          if (placeType === 'country') type = 'country';
          else if (placeType === 'place' || placeType === 'locality') type = 'city';
          else if (placeType === 'region') type = 'place';

          // Extract country code from context
          let countryCode = '';
          if (type === 'country') {
            // For countries, the feature properties should have the ISO code
            countryCode = feature.properties?.short_code || feature.properties?.iso_3166_1_alpha_2 || '';
          } else {
            // For cities/places, look in the context for country information
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
        
        console.log('Processed locations:', locations);
        setSearchResults(locations);
      } else {
        console.log('Search API response not ok:', response.status);
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
    if (!mapContainer.current || !token || (selectedLocations.length === 0 && photoLocations.length === 0)) return;

    mapboxgl.accessToken = token;

    // Calculate center based on all locations (selected + photo locations)
    const allLocations = [
      ...selectedLocations.map(loc => ({ lat: loc.coordinates[1], lng: loc.coordinates[0] })),
      ...photoLocations
    ];
    
    if (allLocations.length === 0) return;

    const avgLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length;
    const avgLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [avgLng, avgLat],
      zoom: allLocations.length > 1 ? 4 : 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Store markers in a ref to track them
    const markers: mapboxgl.Marker[] = [];

    // Add markers for selected locations (red)
    selectedLocations.forEach((location, index) => {
      const marker = new mapboxgl.Marker({ 
        color: '#ef4444', // Red color for selected locations
        scale: 1.2 
      })
        .setLngLat(location.coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${location.name}</h3>
            <p class="text-sm text-gray-600">${location.fullName}</p>
          </div>
        `))
        .addTo(map.current!);
      
      markers.push(marker);
    });

    // Add markers for photo locations (green with photo info)
    photoLocations.forEach((photoLoc, index) => {
      const markerElement = document.createElement('div');
      markerElement.className = 'photo-location-marker';
      markerElement.innerHTML = `
        <div style="background: #22c55e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; position: relative;">
          📷
          <button onclick="removePhotoLocation(${photoLoc.photoIndex})" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
        </div>
      `;
      
      const marker = new mapboxgl.Marker({ 
        element: markerElement
      })
        .setLngLat([photoLoc.lng, photoLoc.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${photoLoc.name}</h3>
            <p class="text-sm text-gray-600">From photo location data</p>
            <button onclick="removePhotoLocation(${photoLoc.photoIndex})" class="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded">Remove Pin</button>
          </div>
        `))
        .addTo(map.current!);
      
      markers.push(marker);
    });

    // Make remove functions globally available
    (window as any).removePhotoLocation = removePhotoLocation;
    (window as any).removeCustomStop = removeCustomStop;

    // If we have multiple locations, draw a route line between them
    if (selectedLocations.length > 1) {
      const coordinates = selectedLocations.map(loc => loc.coordinates);
      
      map.current.on('load', () => {
        map.current!.addSource('selected-route', {
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
          id: 'selected-route',
          type: 'line',
          source: 'selected-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        });
      });
    }

    // Allow clicking to add additional route points
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      setTripRoute(currentRoute => {
        const newPoint = {
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          name: `Stop ${currentRoute.length + 1}`
        };
        
        const newRoute = [...currentRoute, newPoint];
        const currentStopIndex = currentRoute.length;

        // Add marker for custom route point with remove button
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-stop-marker';
        markerElement.innerHTML = `
          <div style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; position: relative;">
            ${currentStopIndex + 1}
            <button onclick="removeCustomStop(${currentStopIndex})" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
          </div>
        `;
        
        const marker = new mapboxgl.Marker({ 
          element: markerElement
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${newPoint.name}</h3>
              <p class="text-sm text-gray-600">Custom route point</p>
              <button onclick="removeCustomStop(${currentStopIndex})" class="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded">Remove Stop</button>
            </div>
          `))
          .addTo(map.current!);
        
        markers.push(marker);

        // Draw custom route if we have multiple custom points
        if (newRoute.length > 1) {
          const customCoordinates = newRoute.map(point => [point.lng, point.lat]);
          
          if (map.current!.getSource('custom-route')) {
            (map.current!.getSource('custom-route') as mapboxgl.GeoJSONSource).setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: customCoordinates
              }
            });
          } else {
            map.current!.addSource('custom-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: customCoordinates
                }
              }
            });

            map.current!.addLayer({
              id: 'custom-route',
              type: 'line',
              source: 'custom-route',
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
  }, [selectedLocations, photoLocations, mapboxToken, userMapboxToken]);

  // Extract GPS coordinates from photo EXIF data
  const extractGPSFromPhoto = (dataUrl: string): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          EXIF.getData(img as any, function(this: any) {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const lon = EXIF.getTag(this, "GPSLongitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
            
            if (lat && lon && latRef && lonRef) {
              // Convert DMS to decimal degrees
              const latDecimal = lat[0] + lat[1]/60 + lat[2]/3600;
              const lonDecimal = lon[0] + lon[1]/60 + lon[2]/3600;
              
              const finalLat = latRef === "S" ? -latDecimal : latDecimal;
              const finalLon = lonRef === "W" ? -lonDecimal : lonDecimal;
              
              resolve({ lat: finalLat, lng: finalLon });
            } else {
              resolve(null);
            }
          });
        } catch (error) {
          console.log('No EXIF data found in photo');
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  };

  const selectPhoto = async () => {
    try {
      console.log('Starting photo selection...');
      setIsSelectingPhoto(true);
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      console.log('Photo received from camera:', !!photo.dataUrl);

      if (photo.dataUrl) {
        const newPhotoIndex = selectedPhotos.length;
        console.log('Adding photo at index:', newPhotoIndex);
        setSelectedPhotos(prev => [...prev, photo.dataUrl]);
        
        // Extract GPS coordinates from photo (don't let this block the photo addition)
        try {
          console.log('Attempting to extract GPS data...');
          const gpsCoords = await extractGPSFromPhoto(photo.dataUrl);
          console.log('GPS extraction result:', gpsCoords);
          
          if (gpsCoords) {
            const photoLocation = {
              lat: gpsCoords.lat,
              lng: gpsCoords.lng,
              name: `Photo ${newPhotoIndex + 1}`,
              photoIndex: newPhotoIndex
            };
            
            setPhotoLocations(prev => [...prev, photoLocation]);
            
            toast({
              title: "Location detected",
              description: `GPS coordinates found in photo and added to map`,
            });
          } else {
            console.log('No GPS coordinates found in photo');
          }
        } catch (gpsError) {
          console.error('Error extracting GPS from photo:', gpsError);
          // Don't show error to user, just continue without GPS data
        }
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      toast({
        title: "Error",
        description: "Failed to select photo",
        variant: "destructive",
      });
    } finally {
      console.log('Photo selection complete, setting isSelectingPhoto to false');
      setIsSelectingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    // Remove corresponding photo location if it exists
    setPhotoLocations(prev => prev.filter(loc => loc.photoIndex !== index));
    // Update photo indices for remaining photos
    setPhotoLocations(prev => prev.map(loc => 
      loc.photoIndex > index ? { ...loc, photoIndex: loc.photoIndex - 1, name: `Photo ${loc.photoIndex}` } : loc
    ));
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

  const removePhotoLocation = (photoIndex: number) => {
    setPhotoLocations(prev => prev.filter(loc => loc.photoIndex !== photoIndex));
    toast({
      title: "Location removed",
      description: "Photo location pin removed from map",
    });
  };

  const removeCustomStop = (stopIndex: number) => {
    setTripRoute(prev => {
      const newRoute = prev.filter((_, index) => index !== stopIndex);
      // Update names for remaining stops
      return newRoute.map((stop, index) => ({
        ...stop,
        name: `Stop ${index + 1}`
      }));
    });
    toast({
      title: "Stop removed",
      description: "Custom route point removed from map",
    });
  };

  const handleNext = () => {
    if (selectedLocations.length === 0) {
      alert('Please select at least one location first');
      return;
    }
    
    // Navigate to trip details page with current data
    // Convert selectedLocations to route format
    const selectedLocationsRoute = selectedLocations.map(location => ({
      lat: location.coordinates[1],
      lng: location.coordinates[0], 
      name: location.name
    }));

    const tripData = {
      locations: selectedLocations,
      photos: selectedPhotos,
      route: [...selectedLocationsRoute, ...tripRoute, ...photoLocations]
    };
    
    console.log('=== DEBUG: TripPostCreator navigation data ===');
    console.log('selectedLocations:', selectedLocations);
    console.log('tripRoute:', tripRoute);
    console.log('photoLocations:', photoLocations);
    console.log('combined route:', [...tripRoute, ...photoLocations]);
    console.log('final tripData:', tripData);
    
    navigate('/trip-details', { state: tripData });
  };

  const handleSkipPhotos = () => {
    setSelectedPhotos([]);
    setPhotoLocations([]);
    // Indicate photos were skipped
    console.log('Photos skipped');
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
                    {location.flag || '🌍'}
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
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search destinations..." 
                  value={searchQuery}
                  onValueChange={(value) => {
                    console.log('Command input value changed:', value);
                    setSearchQuery(value);
                  }}
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
                          value={location.name}
                          onSelect={() => addLocation(location)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg">
                              {location.flag || '🌍'}
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
                      // Clear only custom route markers and lines, keep selected location markers
                      if (map.current.getSource('custom-route')) {
                        map.current.removeLayer('custom-route');
                        map.current.removeSource('custom-route');
                      }
                      
                      // Remove only blue custom markers, keep red location markers
                      const customMarkers = document.querySelectorAll('.mapboxgl-marker[style*="rgb(59, 130, 246)"]');
                      customMarkers.forEach(marker => marker.remove());
                    }
                  }}
                  className="ml-auto text-xs"
                >
                  Clear Custom Route
                </Button>
              )}
            </div>
            <div className="relative h-80">
              {selectedLocations.length > 0 && (mapboxToken || userMapboxToken) ? (
                <>
                  <div ref={mapContainer} className="absolute inset-0" />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded p-2 text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Selected cities</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Photo locations</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Click to add custom stops</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {(selectedLocations.length === 0 && photoLocations.length === 0) ? 'Select destinations or add photos with location data' : 'Add Mapbox token to view map'}
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
                    {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} • {photoLocations.length} with location data
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
                      {photoLocations.find(loc => loc.photoIndex === index) && (
                        <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                          📍
                        </div>
                      )}
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
      </div>
    </div>
  );
};

export default TripPostCreator;