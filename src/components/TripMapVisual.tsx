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

    // Prevent re-initialization if map already exists
    if (map.current) {
      console.log('=== DEBUG: Map already exists, skipping initialization ===');
      return;
    }

    console.log('=== DEBUG: Initializing map ===');

    try {
      // Initialize map with minimal configuration
      mapboxgl.accessToken = mapboxToken;
      
      console.log('=== DEBUG: Creating map with container ===', mapContainer.current);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [stops[0].lng, stops[0].lat],
        zoom: 6,
        interactive: true,
        preserveDrawingBuffer: true,
        attributionControl: false,
        logoPosition: 'bottom-right',
        projection: 'globe'
      });

      console.log('=== DEBUG: Map created ===', map.current);

      // Add enhanced geographical features after map loads
      map.current.on('load', () => {
        console.log('=== DEBUG: Map load event fired ===');
        
        if (!map.current) {
          console.log('=== DEBUG: Map reference lost during load ===');
          return;
        }
        
        try {
          // Add state/country boundaries for better geographical context
          map.current.addSource('admin-boundaries', {
            type: 'vector',
            url: 'mapbox://mapbox.boundaries-adm1-v3'
          });

          // Add state boundaries layer
          map.current.addLayer({
            id: 'admin-1-boundary',
            type: 'line',
            source: 'admin-boundaries',
            'source-layer': 'boundaries_admin_1',
            paint: {
              'line-color': '#627BC1',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.5,
                4, 1,
                8, 2
              ],
              'line-opacity': 0.5
            },
            filter: ['==', ['get', 'admin_level'], 1]
          });

          // Add country boundaries layer
          map.current.addSource('country-boundaries', {
            type: 'vector',
            url: 'mapbox://mapbox.boundaries-adm0-v3'
          });

          map.current.addLayer({
            id: 'admin-0-boundary',
            type: 'line',
            source: 'country-boundaries',
            'source-layer': 'boundaries_admin_0',
            paint: {
              'line-color': '#627BC1',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                4, 2,
                8, 3
              ],
              'line-opacity': 0.7
            }
          });
          
          // Add markers for all stops
          stops.forEach((stop, index) => {
            if (!map.current) return;
            
            // Create custom marker element with better styling
            const markerElement = document.createElement('div');
            markerElement.className = 'custom-marker';
            markerElement.style.cssText = `
              background: #3B82F6;
              border: 3px solid white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            markerElement.textContent = (index + 1).toString();

            const marker = new mapboxgl.Marker({ element: markerElement })
              .setLngLat([stop.lng, stop.lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div style="font-weight: bold; padding: 8px;">${index + 1}. ${stop.name}</div>`
              ))
              .addTo(map.current);
            console.log(`=== DEBUG: Marker ${index + 1} added for ${stop.name} ===`);
          });

          // Add enhanced route line if multiple stops
          if (stops.length > 1 && map.current) {
            console.log('=== DEBUG: Adding route line for multiple stops ===');
            const coordinates = stops.map(stop => [stop.lng, stop.lat]);
            
            map.current.addSource('route', {
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

            // Add route shadow for better visibility
            map.current.addLayer({
              id: 'route-shadow',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#000000',
                'line-width': 6,
                'line-opacity': 0.3,
                'line-blur': 2
              }
            });

            // Add main route line
            map.current.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#3B82F6',
                'line-width': 4,
                'line-opacity': 0.9
              }
            });

            // Fit map to show all stops with appropriate zoom level
            const bounds = new mapboxgl.LngLatBounds();
            stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
            
            // Calculate the appropriate padding based on the distance
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const distance = Math.sqrt(
              Math.pow(ne.lat - sw.lat, 2) + Math.pow(ne.lng - sw.lng, 2)
            );
            
            // Use more padding for longer distances to show more geographical context
            const basePadding = distance > 10 ? 80 : 50;
            
            map.current.fitBounds(bounds, { 
              padding: { 
                top: basePadding, 
                bottom: basePadding, 
                left: basePadding, 
                right: basePadding 
              },
              maxZoom: 10 // Prevent zooming in too much to maintain geographical context
            });
            console.log('=== DEBUG: Map fitted to bounds with geographical context ===');
          }
        } catch (layerError) {
          console.error('=== DEBUG: Error adding layers ===', layerError);
          // Continue without boundaries if they fail to load
        }
      });

      map.current.on('error', (e) => {
        console.error('=== DEBUG: Map error ===', e);
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });

    } catch (error) {
      console.error('=== DEBUG: Map initialization error ===', error);
      setError(`Map init failed: ${error}`);
    }

    // Only cleanup on component unmount
    return () => {
      console.log('=== DEBUG: Component unmounting - cleaning up map ===');
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Watch for token and stops changes
  useEffect(() => {
    if (mapboxToken && stops && stops.length > 0 && !map.current) {
      // Trigger map initialization
      console.log('=== DEBUG: Dependencies ready, will initialize map ===');
    }
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
    <div className={`relative rounded-lg overflow-hidden w-full h-full ${className}`}>
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