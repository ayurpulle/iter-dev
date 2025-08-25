import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Globe } from 'lucide-react';

interface Pin {
  location: string;
  lat: number;
  lng: number;
  friends: string[];
  trips: number;
}

interface InteractiveGlobeProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
}

// Fallback CSS globe for when Mapbox isn't available
const FallbackGlobe: React.FC<InteractiveGlobeProps> = ({ pins, onPinClick }) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.3) % 360); // Slower rotation
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-96 bg-gradient-to-b from-slate-900 to-slate-700 rounded-2xl overflow-hidden flex items-center justify-center">
      <div 
        className="w-72 h-72 rounded-full bg-gradient-to-br from-blue-500 to-green-500 relative shadow-2xl"
        style={{ 
          transform: `rotateY(${rotation}deg)`, 
          transformStyle: 'preserve-3d',
          transition: 'transform 0.1s linear'
        }}
      >
        {/* Continent shapes */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-20 h-16 bg-green-700 opacity-80 rounded-lg transform rotate-12"></div>
          <div className="absolute top-1/3 right-1/4 w-16 h-20 bg-green-700 opacity-80 rounded-lg transform -rotate-12"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-12 bg-green-700 opacity-80 rounded-lg"></div>
          <div className="absolute top-1/2 left-1/2 w-12 h-8 bg-green-700 opacity-80 rounded transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Pins */}
        {pins.map((pin, idx) => (
          <button
            key={idx}
            onClick={() => onPinClick(pin)}
            className="absolute w-4 h-4 bg-red-500 rounded-full shadow-lg animate-pulse cursor-pointer hover:scale-150 transition-transform border-2 border-white"
            style={{
              top: `${pin.lat}%`,
              left: `${pin.lng}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title={`${pin.location} - ${pin.friends.length} friends visited`}
          />
        ))}
      </div>
      
      <div className="absolute top-4 left-4 bg-card border backdrop-blur text-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-2">
        <Globe size={16} />
        Fallback Globe • Click pins to explore
      </div>
    </div>
  );
};

const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({ pins, onPinClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [useMapbox, setUseMapbox] = useState(false);

  useEffect(() => {
    // Check for stored token first
    const storedToken = localStorage.getItem('mapbox_token');
    if (storedToken) {
      setMapboxToken(storedToken);
      setUseMapbox(true);
    } else {
      // Show fallback globe by default
      setUseMapbox(false);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !useMapbox) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: { name: 'globe' },
        zoom: 1.5,
        center: [30, 15],
        pitch: 0,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Smooth rotation animation
      const secondsPerRevolution = 300;
      const maxSpinZoom = 4;
      const slowSpinZoom = 2;
      let userInteracting = false;
      let spinEnabled = true;

      // Add atmosphere and fog effects when style loads
      map.current.on('style.load', () => {
        if (map.current) {
          map.current.setFog({
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': 'rgb(11, 11, 25)',
            'star-intensity': 0.6,
          });
        }
      });

      // Gentle spin function
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
          center.lng -= distancePerSecond / 60;
          map.current.easeTo({ 
            center, 
            duration: 1000, 
            easing: (n) => n 
          });
        }
      }

      // Event listeners for user interaction
      map.current.on('mousedown', () => {
        userInteracting = true;
      });
      
      map.current.on('dragstart', () => {
        userInteracting = true;
      });
      
      map.current.on('mouseup', () => {
        userInteracting = false;
        setTimeout(spinGlobe, 1000);
      });
      
      map.current.on('touchend', () => {
        userInteracting = false;
        setTimeout(spinGlobe, 1000);
      });

      map.current.on('moveend', () => {
        if (!userInteracting) {
          spinGlobe();
        }
      });

      // Add pins to map
      pins.forEach((pin, index) => {
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.style.cssText = `
          width: 20px;
          height: 20px;
          background-color: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        `;

        if (index === 0) {
          const style = document.createElement('style');
          style.textContent = `
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
              70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          `;
          document.head.appendChild(style);
        }

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!);

        markerElement.addEventListener('click', () => {
          onPinClick(pin);
        });

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false
        }).setHTML(`
          <div style="font-family: system-ui; padding: 4px; color: #333;">
            <strong>${pin.location}</strong><br>
            ${pin.friends.length} friends visited<br>
            ${pin.trips} trips
          </div>
        `);

        markerElement.addEventListener('mouseenter', () => {
          popup.setLngLat([pin.lng, pin.lat]).addTo(map.current!);
        });

        markerElement.addEventListener('mouseleave', () => {
          popup.remove();
        });
      });

      setTimeout(spinGlobe, 2000);

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setUseMapbox(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, pins, onPinClick, useMapbox]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken.trim());
      setShowTokenInput(false);
      setUseMapbox(true);
    }
  };

  const handleUpgradeToMapbox = () => {
    setShowTokenInput(true);
  };

  if (showTokenInput) {
    return (
      <div className="w-full h-96 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center p-8">
        <div className="bg-card border rounded-lg p-6 max-w-md w-full">
          <h3 className="text-foreground text-lg font-semibold mb-4">Setup Interactive Map</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Enter your Mapbox public token to enable the interactive globe.
            Get one free at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIi..."
            />
            <div className="flex gap-2">
              <Button onClick={handleTokenSubmit} className="flex-1">
                Enable Interactive Map
              </Button>
              <Button variant="outline" onClick={() => setShowTokenInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback globe if not using Mapbox
  if (!useMapbox) {
    return (
      <div className="relative">
        <FallbackGlobe pins={pins} onPinClick={onPinClick} />
        <div className="absolute bottom-4 right-4">
          <Button onClick={handleUpgradeToMapbox} size="sm" variant="secondary">
            Upgrade to Interactive Globe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden bg-slate-900">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-card border backdrop-blur text-foreground px-3 py-2 rounded-lg text-sm">
        Interactive Globe • Click pins to explore
      </div>
    </div>
  );
};

export default InteractiveGlobe;