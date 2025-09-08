import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';

// Add Mapbox CSS directly to avoid import issues
const mapboxCSS = `
  .mapboxgl-map {
    font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif;
    overflow: hidden;
    position: relative;
    -webkit-tap-highlight-color: rgba(0,0,0,0);
    height: 100% !important;
  }
  .mapboxgl-canvas-container.mapboxgl-interactive,
  .mapboxgl-ctrl-group button.mapboxgl-ctrl-compass {
    cursor: -webkit-grab;
    cursor: -moz-grab;
    cursor: grab;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .mapboxgl-canvas-container.mapboxgl-interactive.mapboxgl-track-pointer {
    cursor: pointer;
  }
  .mapboxgl-canvas-container.mapboxgl-interactive:active,
  .mapboxgl-ctrl-group button.mapboxgl-ctrl-compass:active {
    cursor: -webkit-grabbing;
    cursor: -moz-grabbing;
    cursor: grabbing;
  }
  .mapboxgl-canvas-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100% !important;
  }
  .mapboxgl-canvas {
    position: absolute;
    left: 0;
    top: 0;
    height: 100% !important;
  }
  /* Hide Mapbox logo and attribution */
  .mapboxgl-ctrl-logo {
    display: none !important;
  }
  .mapboxgl-ctrl-attrib {
    display: none !important;
  }
  .mapboxgl-control-container {
    display: none !important;
  }
`;

interface TripStop {
  name: string;
  lat: number;
  lng: number;
}

interface TripMapVisualProps {
  stops: TripStop[];
  className?: string;
}

const TripMapVisual = ({ stops, className }: TripMapVisualProps) => {
  console.log('=== DEBUG: TripMapVisual component rendered ===', stops);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inject Mapbox CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = mapboxCSS;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      console.log('=== DEBUG: Fetching Mapbox token ===');
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        console.log('=== DEBUG: Token response ===', { data, error });
        if (error) {
          setError(`Token fetch error: ${error.message}`);
          return;
        }
        if (data?.token) {
          setMapboxToken(data.token);
          console.log('=== DEBUG: Token set successfully ===');
        } else {
          setError('No token received from server');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        setError(`Token fetch failed: ${error}`);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    console.log('=== DEBUG: Map effect triggered ===', { 
      hasContainer: !!mapContainer.current, 
      hasToken: !!mapboxToken, 
      hasStops: !!(stops && stops.length > 0),
      stopsLength: stops?.length 
    });
    
    if (!mapContainer.current || !mapboxToken || !stops || stops.length === 0) {
      console.log('=== DEBUG: Map initialization skipped ===');
      return;
    }

    console.log('=== DEBUG: Initializing map ===');

    try {
      // Initialize map with minimal configuration
      mapboxgl.accessToken = mapboxToken;
      
      console.log('=== DEBUG: Creating map with container ===', mapContainer.current);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v11',
        center: [stops[0].lng, stops[0].lat],
        zoom: 8,
        interactive: true,
        preserveDrawingBuffer: true,
        attributionControl: false, // Disable attribution control
        logoPosition: 'bottom-right' // This will be hidden by CSS anyway
      });

      console.log('=== DEBUG: Map created ===', map.current);

      // Add a simple marker after map loads
      map.current.on('load', () => {
        console.log('=== DEBUG: Map load event fired ===');
        
        // Add markers for all stops - smaller size for trip posts
        stops.forEach((stop, index) => {
          const marker = new mapboxgl.Marker({ 
            color: '#3B82F6',
            scale: 0.7  // Smaller pins for trip posts
          })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="font-weight: bold;">${index + 1}. ${stop.name}</div>`
            ))
            .addTo(map.current!);
          console.log(`=== DEBUG: Marker ${index + 1} added for ${stop.name} ===`);
        });

        // Add route line if multiple stops
        if (stops.length > 1) {
          console.log('=== DEBUG: Adding route line for multiple stops ===');
          const coordinates = stops.map(stop => [stop.lng, stop.lat]);
          
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
              'line-color': '#3B82F6',
              'line-width': 3,
              'line-opacity': 0.8
            }
          });

          // Fit map to show all stops
          const bounds = new mapboxgl.LngLatBounds();
          stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
          map.current!.fitBounds(bounds, { 
            padding: { top: 50, bottom: 50, left: 50, right: 50 }
          });
          console.log('=== DEBUG: Map fitted to bounds ===');
        }
      });

      // Log any style load events
      map.current.on('styledata', () => {
        console.log('=== DEBUG: Map style loaded ===');
      });

      map.current.on('sourcedata', (e) => {
        console.log('=== DEBUG: Map source data ===', e.sourceDataType);
      });

      map.current.on('error', (e) => {
        console.error('=== DEBUG: Map error ===', e);
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });

    } catch (error) {
      console.error('=== DEBUG: Map initialization error ===', error);
      setError(`Map init failed: ${error}`);
    }

    // Cleanup
    return () => {
      console.log('=== DEBUG: Cleaning up map ===');
      map.current?.remove();
    };
  }, [mapboxToken, stops]);

  // Show error state
  if (error) {
    return (
      <div className={`bg-red-500 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4 text-white">
          <div className="text-lg font-bold">Map Error</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!mapboxToken) {
    return (
      <div className={`bg-blue-500 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4 text-white">
          <div className="text-lg font-bold">Loading Map...</div>
        </div>
      </div>
    );
  }

  if (!stops || stops.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4 text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-sm opacity-90">No locations to show</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ height: '100%', minHeight: '200px' }} 
      />
      
      {/* Map overlay with trip info */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm z-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="font-medium">
            {stops.length} stop{stops.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TripMapVisual;