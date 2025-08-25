import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './ui/button';
import { Input } from './ui/input';

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

const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({ pins, onPinClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    // Check for stored token first
    const storedToken = localStorage.getItem('mapbox_token');
    if (storedToken) {
      setMapboxToken(storedToken);
    } else {
      setShowTokenInput(true);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
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
      const secondsPerRevolution = 300; // Slower rotation
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
          center.lng -= distancePerSecond / 60; // Divide by 60 for per-frame movement
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
        setTimeout(spinGlobe, 1000); // Resume spinning after 1 second
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
        // Create custom marker element
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

        // Add CSS for pulse animation
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

        // Create marker and add to map
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!);

        // Add click handler
        markerElement.addEventListener('click', () => {
          onPinClick(pin);
        });

        // Add popup on hover
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false
        }).setHTML(`
          <div style="font-family: system-ui; padding: 4px;">
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

      // Start gentle spinning
      setTimeout(spinGlobe, 2000);

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setShowTokenInput(true);
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, pins, onPinClick]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken.trim());
      setShowTokenInput(false);
    }
  };

  if (showTokenInput) {
    return (
      <div className="w-full h-96 bg-gradient-to-b from-blue-900 to-purple-900 rounded-2xl flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 max-w-md w-full">
          <h3 className="text-white text-lg font-semibold mb-4">Setup Interactive Map</h3>
          <p className="text-white/80 text-sm mb-4">
            Enter your Mapbox public token to enable the interactive globe.
            Get one free at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">mapbox.com</a>
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIi..."
              className="bg-white/20 text-white placeholder:text-white/60 border-white/30"
            />
            <Button onClick={handleTokenSubmit} className="w-full">
              Enable Interactive Map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white px-3 py-2 rounded-lg text-sm">
        Interactive Globe • Click pins to explore
      </div>
    </div>
  );
};

export default InteractiveGlobe;