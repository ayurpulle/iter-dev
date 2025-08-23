import React from "react";

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface MiniMapProps {
  stops: Stop[];
  className?: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ stops, className = "" }) => {
  // Create a simple SVG representation of the route
  const viewBoxSize = 100;
  const padding = 10;
  
  // Normalize coordinates to fit within viewBox
  const normalizeCoords = (stops: Stop[]) => {
    if (stops.length === 0) return [];
    
    const lats = stops.map(s => s.lat);
    const lngs = stops.map(s => s.lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    
    return stops.map(stop => ({
      ...stop,
      x: padding + ((stop.lng - minLng) / lngRange) * (viewBoxSize - 2 * padding),
      y: padding + ((maxLat - stop.lat) / latRange) * (viewBoxSize - 2 * padding), // Flip Y axis
    }));
  };
  
  const normalizedStops = normalizeCoords(stops);
  
  // Create path string for polyline
  const pathString = normalizedStops
    .map((stop, index) => `${index === 0 ? 'M' : 'L'} ${stop.x} ${stop.y}`)
    .join(' ');
  
  return (
    <div className={`bg-muted rounded-lg overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full"
        style={{ minHeight: '120px' }}
      >
        {/* Route line */}
        {normalizedStops.length > 1 && (
          <path
            d={pathString}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Stop markers */}
        {normalizedStops.map((stop, index) => (
          <g key={index}>
            <circle
              cx={stop.x}
              cy={stop.y}
              r="3"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="1"
            />
            <text
              x={stop.x}
              y={stop.y - 8}
              textAnchor="middle"
              className="text-xs fill-foreground font-medium"
              style={{ fontSize: '6px' }}
            >
              {stop.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default MiniMap;