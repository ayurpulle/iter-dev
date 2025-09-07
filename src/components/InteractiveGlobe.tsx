import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

  console.log('FallbackGlobe rendering with pins:', pins);

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
        {pins.map((pin, idx) => {
          // Convert lat/lng to approximate percentage positions on the sphere
          // San Francisco: lat: 37.779238, lng: -122.419359
          // New York: lat: 40.712749, lng: -74.005994
          
          // Simple mapping for fallback globe
          let x, y;
          if (pin.location === "San Francisco") {
            x = 25; // West coast
            y = 45; // Mid latitude
          } else if (pin.location === "New York") {
            x = 75; // East coast  
            y = 40; // Similar latitude
          } else {
            // Generic conversion for other locations
            x = ((pin.lng + 180) / 360) * 100;
            y = ((90 - pin.lat) / 180) * 100;
          }
          
          console.log(`Pin ${idx} (${pin.location}): positioned at ${x}%, ${y}%`);
          
          return (
            <button
              key={idx}
              onClick={() => onPinClick(pin)}
              className="absolute w-6 h-6 bg-red-500 rounded-full shadow-lg animate-pulse cursor-pointer hover:scale-150 transition-transform border-2 border-white z-20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              title={`${pin.location} - ${pin.friends.length} friends visited`}
            >
              <div className="w-full h-full bg-red-500 rounded-full animate-ping"></div>
            </button>
          );
        })}
      </div>
      
      <div className="absolute top-4 left-4 bg-card border backdrop-blur text-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-2">
        <Globe size={16} />
        Fallback Globe • {pins.length} pins • Click pins to explore
      </div>
    </div>
  );
};

const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({ pins, onPinClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch Mapbox token from secure edge function
    const fetchMapboxToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const response = await supabase.functions.invoke('get-mapbox-token', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const { token } = response.data;
        setMapboxToken(token);
        setError('');
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError('Failed to load map');
      } finally {
        setLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    console.log('InteractiveGlobe useEffect triggered with pins:', pins, 'mapboxToken:', mapboxToken, 'loading:', loading);
    if (!mapContainer.current || !mapboxToken || loading) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: { name: 'globe' },
        zoom: 1.2,
        center: [-98, 39], // Center on North America to show both SF and NYC
        pitch: 0,
      });

      // Add navigation controls positioned to avoid bottom bar
      const nav = new mapboxgl.NavigationControl({
        visualizePitch: true,
      });
      map.current.addControl(nav, 'top-right');

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
            color: 'rgb(60, 80, 110)',
            'high-color': 'rgb(20, 40, 80)',
            'horizon-blend': 0.05,
            'space-color': 'rgb(10, 15, 25)',
            'star-intensity': 0.8,
          });

          // Add distinctive country borders
          map.current.addLayer({
            id: 'country-borders',
            type: 'line',
            source: {
              type: 'vector',
              url: 'mapbox://mapbox.country-boundaries-v1'
            },
            'source-layer': 'country_boundaries',
            paint: {
              'line-color': '#60a5fa',
              'line-width': 1.5,
              'line-opacity': 0.8
            }
          });

          // Add admin boundaries for states/provinces
          map.current.addLayer({
            id: 'admin-borders',
            type: 'line',
            source: {
              type: 'vector',
              url: 'mapbox://mapbox.boundaries-adm1-v3'
            },
            'source-layer': 'boundaries_admin_1',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 0.8,
              'line-opacity': 0.6
            }
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

      // Function to add pins after map is ready
      const addPinsToMap = () => {
        console.log('About to add pins to Mapbox map. Pins array:', pins);
        console.log('Pins length:', pins.length);
        
        pins.forEach((pin, index) => {
          console.log(`Creating marker for pin ${index}:`, pin);
          
          const markerElement = document.createElement('div');
          markerElement.className = 'custom-marker';
          markerElement.style.cssText = `
            width: 30px;
            height: 30px;
            background-color: #ef4444;
            border: 4px solid white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 1000;
            position: relative;
          `;

          // Add pulse animation
          if (index === 0) {
            const style = document.createElement('style');
            style.textContent = `
              .custom-marker {
                animation: marker-pulse 2s infinite;
              }
              @keyframes marker-pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
              }
            `;
            document.head.appendChild(style);
          }

          try {
            console.log(`Creating marker at lng: ${pin.lng}, lat: ${pin.lat}`);
            // Ensure coordinates are valid numbers
            const lng = Number(pin.lng);
            const lat = Number(pin.lat);
            
            if (isNaN(lng) || isNaN(lat)) {
              console.error(`Invalid coordinates for ${pin.location}: lng=${pin.lng}, lat=${pin.lat}`);
              return;
            }
            
            console.log(`✅ Valid coordinates - lng: ${lng}, lat: ${lat}`);
            const marker = new mapboxgl.Marker(markerElement)
              .setLngLat([lng, lat])
              .addTo(map.current!);

            console.log(`✅ Marker successfully added for ${pin.location} at [${pin.lng}, ${pin.lat}]`);

            // Add click handler
            markerElement.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('📍 Pin clicked:', pin);
              onPinClick(pin);
            });

            // Add popup on hover
            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: false,
              closeOnClick: false
            }).setHTML(`
              <div style="font-family: system-ui; padding: 8px; color: #333; font-size: 12px;">
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

          } catch (error) {
            console.error(`❌ Error creating marker for ${pin.location}:`, error);
          }
        });
        
        console.log(`✅ Finished adding ${pins.length} pins to map`);
      };

      // Add pins after map style loads
      if (map.current.isStyleLoaded()) {
        console.log('Map style already loaded, adding pins immediately');
        addPinsToMap();
      } else {
        console.log('Waiting for map style to load before adding pins');
        map.current.on('style.load', () => {
          console.log('Map style loaded, now adding pins');
          addPinsToMap();
        });
      }

      setTimeout(spinGlobe, 2000);

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, pins, onPinClick, loading]);

  // Show loading state
  if (loading) {
    return (
      <div className="relative w-full h-96 bg-gradient-to-b from-slate-900 to-slate-700 rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading interactive globe...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="relative">
        <FallbackGlobe pins={pins} onPinClick={onPinClick} />
        <div className="absolute bottom-4 left-4 bg-red-500 text-white px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-transparent">
      <div ref={mapContainer} className="absolute inset-0 rounded-2xl" style={{
        background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)'
      }} />
      
      {/* Custom CSS to position Mapbox controls properly */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .mapboxgl-ctrl-top-right {
            top: 10px !important;
            right: 10px !important;
            margin: 0 !important;
          }
          .mapboxgl-ctrl-bottom-left {
            bottom: 90px !important;
            left: 10px !important;
            margin: 0 !important;
          }
          .mapboxgl-ctrl-bottom-right {
            bottom: 90px !important;
            right: 10px !important;
            margin: 0 !important;
          }
          .mapboxgl-control-container {
            position: absolute !important;
            z-index: 10 !important;
          }
        `
      }} />
    </div>
  );
};

export default InteractiveGlobe;