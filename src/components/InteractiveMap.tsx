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

      // Function to determine continent based on coordinates (same as InteractiveGlobe)
      const getContinentColor = (lng: number, lat: number, location: string) => {
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

      // Add markers for user's actual trip locations from pins
      pins.forEach((pin) => {
        const lng = Number(pin.lng);
        const lat = Number(pin.lat);
        
        if (isNaN(lng) || isNaN(lat)) {
          console.error(`❌ Invalid coordinates for ${pin.location}`);
          return;
        }
        
        // Get continent-based color
        const pinColor = getContinentColor(lng, lat, pin.location);
        
        const markerElement = document.createElement('div');
        markerElement.style.cssText = `
          cursor: pointer;
          transform: translate(-50%, -100%);
        `;
        
        // Create standardized pin with continent color (same as InteractiveGlobe)
        markerElement.innerHTML = `
          <svg width="28" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ${pinColor}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="${pinColor}" stroke="white" stroke-width="1"/>
          </svg>
          <div style="
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
          " class="pin-label">${pin.location}</div>
        `;

        try {
          const marker = new mapboxgl.Marker(markerElement)
            .setLngLat([lng, lat])
            .addTo(map.current!);

          // Add click handler - trigger the app's location click handler, not a popup
          markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            onLocationClick?.(pin.location);
          });

          // Add hover effects for the pin label
          markerElement.addEventListener('mouseenter', () => {
            const label = markerElement.querySelector('.pin-label') as HTMLElement;
            if (label) label.style.opacity = '1';
          });

          markerElement.addEventListener('mouseleave', () => {
            const label = markerElement.querySelector('.pin-label') as HTMLElement;
            if (label) label.style.opacity = '0';
          });

        } catch (error) {
          console.error(`❌ Error creating pin for ${pin.location}:`, error);
        }
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