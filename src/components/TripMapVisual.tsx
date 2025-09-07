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
  }
  .mapboxgl-canvas {
    position: absolute;
    left: 0;
    top: 0;
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
        style: 'mapbox://styles/mapbox/streets-v11', // Try a different style
        center: [stops[0].lng, stops[0].lat],
        zoom: 8,
        interactive: true,
        preserveDrawingBuffer: true
      });

      console.log('=== DEBUG: Map created ===', map.current);

      // Add a simple marker after map loads
      map.current.on('load', () => {
        console.log('=== DEBUG: Map load event fired ===');
        
        // Just add a simple marker for the first stop
        if (stops[0]) {
          const marker = new mapboxgl.Marker({ color: 'red' })
            .setLngLat([stops[0].lng, stops[0].lat])
            .addTo(map.current!);
          console.log('=== DEBUG: Simple marker added ===', marker);
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
    <div className={`relative rounded-lg overflow-hidden bg-green-500 ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-10" style={{ minHeight: '200px' }} />
      
      {/* DEBUG: This should help us see if the container is sized correctly */}
      <div className="absolute inset-0 bg-yellow-500 opacity-20 pointer-events-none z-5" />
      
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