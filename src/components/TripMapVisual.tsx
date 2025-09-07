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
  console.log('=== DEBUG: TripMapVisual component rendered ===', stops);
  
  // For now, let's just render a simple test component to see if it works
  return (
    <div className={`bg-red-500 rounded-lg flex items-center justify-center ${className}`}>
      <div className="text-center p-4 text-white">
        <div className="text-lg font-bold">TEST MAP COMPONENT</div>
        <div className="text-sm">Stops: {stops?.length || 0}</div>
        {stops?.map((stop, index) => (
          <div key={index} className="text-xs">{stop.name}</div>
        ))}
      </div>
    </div>
  );
};

export default TripMapVisual;