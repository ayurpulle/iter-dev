import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";

interface InteractiveMapProps {
  onLocationClick?: (location: string) => void;
}

const InteractiveMap = ({ onLocationClick }: InteractiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Enhanced trip locations with friends' data
  const tripLocations = [
    { name: "Tokyo", latitude: 35.6762, longitude: 139.6503, trip: "Japan Adventure — Sarah & Friends", friendsCount: 2 },
    { name: "Kyoto", latitude: 35.0116, longitude: 135.7681, trip: "Japan Adventure — Sarah & Friends", friendsCount: 2 },
    { name: "Osaka", latitude: 34.6937, longitude: 135.5023, trip: "Japan Adventure — Sarah & Friends", friendsCount: 2 },
    { name: "Barcelona", latitude: 41.3851, longitude: 2.1734, trip: "Mediterranean Cruise — Emma & Group", friendsCount: 1 },
    { name: "Rome", latitude: 41.9028, longitude: 12.4964, trip: "Mediterranean Cruise — Emma & Group", friendsCount: 1 },
    { name: "Athens", latitude: 37.9838, longitude: 23.7275, trip: "Mediterranean Cruise — Emma & Group", friendsCount: 1 },
    { name: "Santorini", latitude: 36.3932, longitude: 25.4615, trip: "Mediterranean Cruise — Emma & Group", friendsCount: 1 },
    { name: "Reykjavik", latitude: 64.1466, longitude: -21.9426, trip: "Iceland Road Trip — Mike", friendsCount: 1 },
    { name: "Bangkok", latitude: 13.7563, longitude: 100.5018, trip: "Thailand Backpacking — Alex & Friends", friendsCount: 1 },
    { name: "Chiang Mai", latitude: 18.7061, longitude: 98.9817, trip: "Thailand Backpacking — Alex & Friends", friendsCount: 1 },
    { name: "Phuket", latitude: 7.8804, longitude: 98.3923, trip: "Thailand Backpacking — Alex & Friends", friendsCount: 1 },
  ];

  // Fetch Mapbox token from secure edge function
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        // Get current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('get-mapbox-token', {
          headers: session ? {
            Authorization: `Bearer ${session.access_token}`,
          } : {}
        });
        
        if (error) throw error;
        
        if (data?.token) {
          setMapboxToken(data.token);
          setIsTokenSet(true);
        } else {
          setError('Mapbox token not available');
        }
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError('Failed to load map token');
      } finally {
        setLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      projection: 'globe' as any,
      zoom: 0.8,
      center: [0, 15],
      pitch: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add atmosphere and fog effects
    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(200, 200, 225)',
        'horizon-blend': 0.2,
      });

      // Add markers for friends' trip locations
      tripLocations.forEach((location) => {
        const marker = new mapboxgl.Marker({ 
          color: location.friendsCount > 1 ? '#8b5cf6' : '#10b981' // Purple for multiple friends, green for single
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current!);

        // Add click event to marker
        const markerElement = marker.getElement();
        markerElement.addEventListener('click', () => {
          onLocationClick?.(location.name);
        });
        markerElement.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${location.name}</h3>
              <p class="text-sm text-gray-600">${location.trip}</p>
              <p class="text-xs text-blue-600 font-medium">${location.friendsCount} friend${location.friendsCount > 1 ? 's' : ''} visited</p>
              <p class="text-xs text-gray-500">Click to see details</p>
            </div>
          `);

        marker.setPopup(popup);
      });
    });

    // Rotation animation settings
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    let spinEnabled = true;

    // Spin globe function
    function spinGlobe() {
      if (!map.current) return;
      
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    // Event listeners for interaction
    map.current.on('mousedown', () => {
      userInteracting = true;
    });
    
    map.current.on('dragstart', () => {
      userInteracting = true;
    });
    
    map.current.on('mouseup', () => {
      userInteracting = false;
      spinGlobe();
    });
    
    map.current.on('touchend', () => {
      userInteracting = false;
      spinGlobe();
    });

    map.current.on('moveend', () => {
      spinGlobe();
    });

    // Start the globe spinning
    spinGlobe();

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error || !isTokenSet) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-destructive mb-2">{error || 'Map unavailable'}</p>
          <p className="text-sm text-muted-foreground">Please check your connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Swipe up indicator at bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-background/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
          <p className="text-sm text-white/70 font-medium">Swipe up to explore</p>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;