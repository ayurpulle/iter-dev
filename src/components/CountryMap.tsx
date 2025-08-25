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

  if (!mapboxToken) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-lg text-primary font-medium">{stops.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Route map with {stops.length} stop{stops.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
};

export default CountryMap;