import React, { useEffect, useRef } from 'react';

interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface SimpleMapWithPinsProps {
  locations: Location[];
  className?: string;
  mapboxToken?: string;
}

const SimpleMapWithPins = ({ locations, className, mapboxToken }: SimpleMapWithPinsProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Import mapbox dynamically
    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = mapboxToken;
      
      // Calculate center point from locations
      let centerLat = 40.7128; // Default to NYC
      let centerLng = -74.0060;
      let zoom = 2;
      
      if (locations.length > 0) {
        const sumLat = locations.reduce((sum, loc) => sum + loc.lat, 0);
        const sumLng = locations.reduce((sum, loc) => sum + loc.lng, 0);
        centerLat = sumLat / locations.length;
        centerLng = sumLng / locations.length;
        zoom = locations.length === 1 ? 10 : 5; // Zoom in for single location
      }

      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [centerLng, centerLat],
        zoom: zoom,
      });

      // Add navigation controls
      map.addControl(new mapboxgl.default.NavigationControl(), 'top-right');

      // Add markers for each location
      locations.forEach((location, index) => {
        // Create a custom marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.style.cssText = `
          width: 30px;
          height: 30px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        `;
        markerElement.textContent = (index + 1).toString();

        // Create popup with location info
        const popup = new mapboxgl.default.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 8px;">
              <strong>${location.name}</strong><br/>
              <small>Stop ${index + 1}</small>
            </div>
          `);

        // Add marker to map
        new mapboxgl.default.Marker(markerElement)
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map);
      });

      // Draw lines between locations if there are multiple
      if (locations.length > 1) {
        map.on('load', () => {
          const coordinates = locations.map(loc => [loc.lng, loc.lat]);
          
          map.addSource('route', {
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

          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 3,
              'line-opacity': 0.7
            }
          });
        });
      }

      return () => {
        map.remove();
      };
    }).catch(error => {
      console.error('Error loading mapbox:', error);
    });
  }, [locations, mapboxToken]);

  // Fallback display when no mapbox token or locations
  if (!mapboxToken) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <div className="text-2xl mb-2">🗺️</div>
          <p className="text-sm text-muted-foreground">Map unavailable</p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4 text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-sm opacity-90">Route map with 0 stops</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
};

export default SimpleMapWithPins;