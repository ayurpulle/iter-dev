import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface CountryMapProps {
  stops: Stop[];
  className?: string;
  mapboxToken?: string;
}

const CountryMap = ({ stops, className = "h-full w-full", mapboxToken }: CountryMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !stops.length || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    // Calculate bounds from stops
    const bounds = new mapboxgl.LngLatBounds();
    stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      bounds: bounds,
      fitBoundsOptions: {
        padding: 40,
        maxZoom: 8
      }
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add route line
      if (stops.length > 1) {
        const routeCoordinates = stops.map(stop => [stop.lng, stop.lat]);
        
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates
            }
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3
          }
        });
      }

      // Add markers for each stop
      stops.forEach((stop, index) => {
        const marker = new mapboxgl.Marker({ 
          color: index === 0 ? '#10b981' : index === stops.length - 1 ? '#ef4444' : '#3b82f6'
        })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map.current!);

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="text-sm">
              <strong>${stop.name}</strong>
              <br>
              <span class="text-gray-600">
                ${index === 0 ? 'Start' : index === stops.length - 1 ? 'End' : `Stop ${index}`}
              </span>
            </div>
          `);

        marker.setPopup(popup);
      });

      // Disable map interactions for embed view
      map.current.scrollZoom.disable();
      map.current.boxZoom.disable();
      map.current.dragRotate.disable();
      map.current.dragPan.disable();
      map.current.keyboard.disable();
      map.current.doubleClickZoom.disable();
      map.current.touchZoomRotate.disable();
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [stops, mapboxToken]);

  // Show fallback if no mapbox token or no stops
  if (!mapboxToken || !stops.length) {
    return (
      <div className={`${className} bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg flex items-center justify-center relative overflow-hidden`}>
        <div className="text-center p-4 z-10">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-2xl text-white font-bold">{stops.length}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Route map with {stops.length} stop{stops.length !== 1 ? 's' : ''}
          </p>
          {!mapboxToken && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Add Mapbox token to view interactive map
            </p>
          )}
        </div>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M20,50 Q40,30 60,50 T100,50 T140,50 T180,50" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                  className="text-blue-500" />
            <circle cx="20" cy="50" r="4" fill="currentColor" className="text-green-500" />
            <circle cx="60" cy="50" r="3" fill="currentColor" className="text-blue-500" />
            <circle cx="100" cy="50" r="3" fill="currentColor" className="text-blue-500" />
            <circle cx="140" cy="50" r="3" fill="currentColor" className="text-blue-500" />
            <circle cx="180" cy="50" r="4" fill="currentColor" className="text-red-500" />
          </svg>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
};

export default CountryMap;