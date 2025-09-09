import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, X, Camera, Clock, MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationInfo {
  name: string;
  description: string;
  activities: string[];
  bestTimeToVisit: string;
  estimatedCost: string;
  coordinates: [number, number];
}

interface InteractiveItineraryMapProps {
  destinations: string[];
  className?: string;
}

export const InteractiveItineraryMap = ({ destinations = [], className }: InteractiveItineraryMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('get-mapbox-token', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
        });
        
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map and markers
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || destinations.length === 0) {
      console.log('Map initialization skipped:', { 
        hasContainer: !!mapContainer.current, 
        hasToken: !!mapboxToken, 
        hasDestinations: destinations.length > 0 
      });
      return;
    }

    // Prevent multiple map instances
    if (map.current) {
      console.log('Map already exists, skipping initialization');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Geocode destinations to get coordinates
    const geocodeDestinations = async () => {
      const locations: LocationInfo[] = [];
      
      for (const destination of destinations) {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}&types=place,locality&limit=1`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            locations.push({
              name: feature.text,
              description: `Discover the beauty and culture of ${feature.text}`,
              activities: [
                'Explore local landmarks',
                'Try traditional cuisine',
                'Visit cultural sites',
                'Take scenic walks',
                'Experience local nightlife'
              ],
              bestTimeToVisit: 'Year-round destination',
              estimatedCost: '$50-150 per day',
              coordinates: feature.center as [number, number]
            });
          }
        } catch (error) {
          console.error('Error geocoding destination:', destination, error);
        }
      }

      if (locations.length === 0) {
        console.log('No valid locations found');
        return;
      }

      // Double-check container is still available
      if (!mapContainer.current) {
        console.log('Container disappeared during geocoding');
        return;
      }

      // Calculate center point
      const avgLng = locations.reduce((sum, loc) => sum + loc.coordinates[0], 0) / locations.length;
      const avgLat = locations.reduce((sum, loc) => sum + loc.coordinates[1], 0) / locations.length;

      try {
        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [avgLng, avgLat],
          zoom: locations.length > 1 ? 5 : 10,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Function to determine continent color based on coordinates
        const getContinentColor = (lng: number, lat: number) => {
          // North America: roughly -170 to -50 longitude, 15 to 75 latitude
          if (lng >= -170 && lng <= -50 && lat >= 15 && lat <= 75) {
            return '#ef4444'; // Red for North America
          }
          // Europe: roughly -25 to 60 longitude, 35 to 75 latitude
          if (lng >= -25 && lng <= 60 && lat >= 35 && lat <= 75) {
            return '#3b82f6'; // Blue for Europe
          }
          // Asia: roughly 60 to 180 longitude, 5 to 75 latitude
          if (lng >= 60 && lng <= 180 && lat >= 5 && lat <= 75) {
            return '#10b981'; // Green for Asia
          }
          // Africa: roughly -20 to 55 longitude, -35 to 40 latitude
          if (lng >= -20 && lng <= 55 && lat >= -35 && lat <= 40) {
            return '#f59e0b'; // Yellow for Africa
          }
          // South America: roughly -85 to -30 longitude, -60 to 15 latitude
          if (lng >= -85 && lng <= -30 && lat >= -60 && lat <= 15) {
            return '#8b5cf6'; // Purple for South America
          }
          // Oceania: roughly 110 to 180 longitude, -50 to -5 latitude
          if (lng >= 110 && lng <= 180 && lat >= -50 && lat <= -5) {
            return '#ec4899'; // Pink for Oceania
          }
          // Default fallback
          return '#fb923c'; // Orange for unknown
        };

        // Add markers
        const newMarkers: mapboxgl.Marker[] = [];
        locations.forEach((location, index) => {
          // Get continent-based color
          const pinColor = getContinentColor(location.coordinates[0], location.coordinates[1]);
          
          // Create custom marker element with pin icon
          const markerElement = document.createElement('div');
          markerElement.className = 'custom-marker';
          markerElement.style.cssText = `
            cursor: pointer;
            transform: translate(-50%, -100%);
            transition: transform 0.2s ease;
          `;
          
          // Create pin SVG matching the globe style
          markerElement.innerHTML = `
            <svg width="32" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ${pinColor}; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3" fill="${pinColor}" stroke="white" stroke-width="1"/>
            </svg>
          `;

          // Add hover effect
          markerElement.addEventListener('mouseenter', () => {
            markerElement.style.transform = 'translate(-50%, -100%) scale(1.1)';
          });
          markerElement.addEventListener('mouseleave', () => {
            markerElement.style.transform = 'translate(-50%, -100%) scale(1)';
          });

          // Add click handler
          markerElement.addEventListener('click', () => {
            setSelectedLocation(location);
          });

          const marker = new mapboxgl.Marker({ element: markerElement })
            .setLngLat(location.coordinates)
            .addTo(map.current!);

          newMarkers.push(marker);
        });

        setMarkers(newMarkers);

        // Fit bounds to show all markers
        if (locations.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          locations.forEach(location => bounds.extend(location.coordinates));
          map.current.fitBounds(bounds, { padding: 50 });
        }

        console.log('Map initialized successfully with', locations.length, 'locations');

      } catch (error) {
        console.error('Error initializing map:', error);
        map.current = null;
      }
    };

    geocodeDestinations();

    // Cleanup function with proper safety checks
    return () => {
      console.log('Cleaning up InteractiveItineraryMap');
      
      // Clean up markers first
      if (markers.length > 0) {
        markers.forEach(marker => {
          try {
            marker.remove();
          } catch (error) {
            console.warn('Error removing marker:', error);
          }
        });
        setMarkers([]);
      }
      
      // Clean up map with safety checks
      if (map.current) {
        try {
          // Check if map is still valid before removal
          if (map.current.getContainer()) {
            map.current.remove();
          }
        } catch (error) {
          console.warn('Error removing map:', error);
        } finally {
          map.current = null;
        }
      }
    };
  }, [mapboxToken, destinations.join(',')]); // Use join to create stable dependency

  // Early return with loading state if no token
  if (!mapboxToken) {
    return (
      <div className={`h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  // Early return if no destinations
  if (!destinations || destinations.length === 0) {
    return (
      <div className={`h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No destinations to display</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-64 rounded-lg shadow-lg" />
      
      {selectedLocation && (
        <Card className="absolute top-4 left-4 right-4 z-10 max-w-sm mx-auto">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
                {selectedLocation.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLocation(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selectedLocation.description}
            </p>
            
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Popular Activities
              </h4>
              <ul className="text-xs space-y-1">
                {selectedLocation.activities.slice(0, 3).map((activity, index) => (
                  <li key={index} className="text-muted-foreground">• {activity}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedLocation.bestTimeToVisit}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-xs">
              <span className="font-medium">Estimated daily cost: </span>
              {selectedLocation.estimatedCost}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};