import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface InteractiveMapProps {
  onLocationClick?: (location: string) => void;
}

const InteractiveMap = ({ onLocationClick }: InteractiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isTokenSet, setIsTokenSet] = useState(false);

  // Mock trip locations
  const tripLocations = [
    { name: "Medellín", lat: 6.2442, lng: -75.5812, trip: "Colombia — Solo Travel" },
    { name: "Bogotá", lat: 4.7110, lng: -74.0721, trip: "Colombia — Solo Travel" },
    { name: "Porto", lat: 41.1579, lng: -8.6291, trip: "Portugal — Summer" },
    { name: "Évora", lat: 38.5714, lng: -7.9036, trip: "Portugal — Summer" },
    { name: "Lisbon", lat: 38.7223, lng: -9.1393, trip: "Portugal — Summer" },
  ];

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      projection: 'globe' as any,
      zoom: 1.5,
      center: [30, 15],
      pitch: 45,
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

      // Add markers for trip locations
      tripLocations.forEach((location) => {
        const marker = new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat([location.lng, location.lat])
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
              <p class="text-xs text-gray-500">Click to see friends' trips</p>
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

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setIsTokenSet(true);
    }
  };

  if (!isTokenSet) {
    return (
      <div className="flex items-center justify-center h-96 px-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Enter Mapbox Token</h2>
            <p className="text-sm text-muted-foreground">
              Get your free token from{" "}
              <a 
                href="https://mapbox.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
          </div>
          <Button onClick={handleTokenSubmit} className="w-full">
            Load Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-160px)]">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10" />
    </div>
  );
};

export default InteractiveMap;