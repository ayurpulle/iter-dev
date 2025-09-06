import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Route } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface TripPostCreatorProps {
  onBack?: () => void;
}

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
];

const TripPostCreator = ({ onBack }: TripPostCreatorProps) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isSelectingPhoto, setIsSelectingPhoto] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [userMapboxToken, setUserMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tripRoute, setTripRoute] = useState<Array<{lat: number, lng: number, name: string}>>([]);
  
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

  useEffect(() => {
    const token = mapboxToken || userMapboxToken;
    if (!mapContainer.current || !token || !selectedCountry) return;

    mapboxgl.accessToken = token;

    // Country coordinates for initial view
    const countryCoords: { [key: string]: [number, number] } = {
      'US': [-95.7129, 37.0902],
      'GB': [-3.4360, 55.3781],
      'FR': [2.2137, 46.2276],
      'DE': [10.4515, 51.1657],
      'IT': [12.5674, 41.8719],
      'ES': [-3.7492, 40.4637],
      'JP': [138.2529, 36.2048],
      'AU': [133.7751, -25.2744],
      'CA': [-106.3468, 56.1304],
      'BR': [-51.9253, -14.2350],
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: countryCoords[selectedCountry] || [0, 0],
      zoom: 5,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Allow clicking to add route points
    map.current.on('click', (e) => {
      const newPoint = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        name: `Stop ${tripRoute.length + 1}`
      };
      
      const newRoute = [...tripRoute, newPoint];
      setTripRoute(newRoute);

      // Add marker
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(map.current!);

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
    });

    return () => {
      map.current?.remove();
    };
  }, [selectedCountry, mapboxToken, userMapboxToken, tripRoute]);

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

  const handleNext = () => {
    // Handle navigation to next step
    console.log('Trip data:', {
      country: selectedCountry,
      photos: selectedPhotos,
      route: tripRoute
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        
        <h1 className="font-semibold">Trip Post</h1>
        
        <Button
          size="sm"
          onClick={handleNext}
          disabled={!selectedCountry}
        >
          Next
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Country Selection */}
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent>
              {countries.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {selectedCountry && (mapboxToken || userMapboxToken) ? (
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
                      {!selectedCountry ? 'Select a country to view map' : 'Add Mapbox token to view map'}
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
                    onClick={() => setSelectedPhotos([])}
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
            disabled={!selectedCountry}
            onClick={() => {
              // Generate trip map logic
              console.log('Generating trip map for:', {
                country: selectedCountry,
                route: tripRoute,
                photos: selectedPhotos
              });
            }}
          >
            Generate Trip Map
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default TripPostCreator;