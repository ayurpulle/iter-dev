import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !stops || stops.length === 0) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [stops[0].lng, stops[0].lat],
      zoom: stops.length === 1 ? 10 : 8,
      interactive: true
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add markers for each stop
      stops.forEach((stop, index) => {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'trip-marker';
        el.style.backgroundImage = 'url(data:image/svg+xml;base64,' + btoa(`
          <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.7 0 0 6.7 0 15c0 11.3 15 25 15 25s15-13.7 15-25C30 6.7 23.3 0 15 0z" fill="#3B82F6"/>
            <circle cx="15" cy="15" r="8" fill="white"/>
            <text x="15" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#3B82F6">${index + 1}</text>
          </svg>
        `) + ')';
        el.style.width = '30px';
        el.style.height = '40px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.cursor = 'pointer';

        // Add marker to map
        new mapboxgl.Marker(el)
          .setLngLat([stop.lng, stop.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="font-semibold">${stop.name}</div>`
          ))
          .addTo(map.current!);
      });

      // Draw route lines if multiple stops
      if (stops.length > 1) {
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
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      }

      // Fit map to show all stops
      if (stops.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
      }
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, stops]);

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
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Map overlay with trip info */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
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