import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";

interface Pin {
  location: string;
  lat: number;
  lng: number;
  friends: string[];
  trips: number;
  posts?: any[];
}

interface InteractiveMapProps {
  onLocationClick?: (location: string) => void;
  pins?: Pin[];
}

const InteractiveMap = ({ onLocationClick, pins = [] }: InteractiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");


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
      // Mobile optimizations
      preserveDrawingBuffer: false,
      antialias: false, // Disable for better performance on mobile
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add atmosphere and fog effects to match reference image
    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(220, 240, 255)', // Light blue atmosphere
        'high-color': 'rgb(135, 206, 235)', // Sky blue for high altitude
        'horizon-blend': 0.2,
        'space-color': 'rgb(11, 19, 43)', // Dark space background
        'star-intensity': 0.6,
      });

      // Add markers for user's actual trip locations from pins
      pins.forEach((pin) => {
        const marker = new mapboxgl.Marker({ 
          color: pin.friends.length > 1 ? '#8b5cf6' : '#10b981' // Purple for multiple friends, green for single
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!);

        // Add click event to marker
        const markerElement = marker.getElement();
        markerElement.addEventListener('click', () => {
          onLocationClick?.(pin.location);
        });
        markerElement.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${pin.location}</h3>
              <p class="text-sm text-gray-600">${pin.trips} trip${pin.trips > 1 ? 's' : ''}</p>
              <p class="text-xs text-blue-600 font-medium">${pin.friends.length} friend${pin.friends.length > 1 ? 's' : ''} visited</p>
              <p class="text-xs text-gray-500">Click to see details</p>
            </div>
          `);

        marker.setPopup(popup);
      });
    });

    // Mobile-optimized rotation animation
    const secondsPerRevolution = 200; // Slower for smoother performance
    const maxSpinZoom = 3;
    const slowSpinZoom = 2;
    let userInteracting = false;
    let spinEnabled = true;
    let interactionTimeout: NodeJS.Timeout;

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
        map.current.easeTo({ center, duration: 300, easing: (n) => n }); // Optimized for mobile
      }
    }

    // Mobile-optimized interaction handlers
    map.current.on('touchstart', () => {
      userInteracting = true;
      clearTimeout(interactionTimeout);
    });
    
    map.current.on('mousedown', () => {
      userInteracting = true;
      clearTimeout(interactionTimeout);
    });
    
    map.current.on('dragstart', () => {
      userInteracting = true;
      clearTimeout(interactionTimeout);
    });
    
    map.current.on('touchend', () => {
      interactionTimeout = setTimeout(() => {
        userInteracting = false;
        spinGlobe();
      }, 3000); // Longer delay for mobile
    });
    
    map.current.on('mouseup', () => {
      interactionTimeout = setTimeout(() => {
        userInteracting = false;
        spinGlobe();
      }, 1500);
    });

    map.current.on('moveend', () => {
      if (!userInteracting) {
        interactionTimeout = setTimeout(spinGlobe, 1000);
      }
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