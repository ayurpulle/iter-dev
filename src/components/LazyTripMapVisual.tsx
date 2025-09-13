import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the map component
const TripMapVisual = lazy(() => import('@/components/TripMapVisual'));

interface TripStop {
  name: string;
  lat: number;
  lng: number;
}

interface LazyTripMapVisualProps {
  stops: TripStop[];
  className?: string;
}

const MapSkeleton = ({ className }: { className?: string }) => (
  <div className={`relative w-full h-full ${className}`}>
    <Skeleton className="w-full h-full rounded-lg" />
    <div className="absolute top-3 left-3 bg-muted/80 backdrop-blur-sm px-3 py-2 rounded-lg z-20">
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

const LazyTripMapVisual = ({ stops, className }: LazyTripMapVisualProps) => {
  return (
    <Suspense fallback={<MapSkeleton className={className} />}>
      <TripMapVisual stops={stops} className={className} />
    </Suspense>
  );
};

export default LazyTripMapVisual;