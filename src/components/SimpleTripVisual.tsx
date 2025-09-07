import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

interface TripStop {
  name: string;
  lat?: number;
  lng?: number;
  order?: number;
}

interface SimpleTripVisualProps {
  stops: TripStop[];
  className?: string;
}

const SimpleTripVisual = ({ stops, className }: SimpleTripVisualProps) => {
  // Force render the map view for debugging
  console.log('=== DEBUG: FORCE RENDERING MAP ===', stops);
  
  return (
    <div className={`bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={20} />
            <span className="font-semibold">Trip Route</span>
          </div>
          <div className="bg-white/20 px-2 py-1 rounded-full text-sm">
            {stops?.length || 0} stop{(stops?.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Visual route representation */}
        <div className="space-y-3">
          {stops.slice(0, 3).map((stop, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{stop.name}</p>
              </div>
              {index < Math.min(stops.length - 1, 2) && (
                <ArrowRight size={16} className="opacity-70" />
              )}
            </div>
          ))}
          
          {stops.length > 3 && (
            <div className="flex items-center gap-3 opacity-80">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs">
                +{stops.length - 3}
              </div>
              <p className="text-sm">more stops...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleTripVisual;