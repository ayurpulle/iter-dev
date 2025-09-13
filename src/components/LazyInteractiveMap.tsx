import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the interactive map component
const InteractiveMap = lazy(() => import('@/components/InteractiveMap'));

interface Pin {
  location: string;
  lat: number;
  lng: number;
  friends: string[];
  trips: number;
  posts?: any[];
}

interface LazyInteractiveMapProps {
  onLocationClick?: (location: string) => void;
  pins?: Pin[];
}

const MapSkeleton = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-muted">
    <div className="text-center">
      <Skeleton className="h-8 w-8 rounded-full mx-auto mb-4" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
  </div>
);

const LazyInteractiveMap = ({ onLocationClick, pins }: LazyInteractiveMapProps) => {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <InteractiveMap onLocationClick={onLocationClick} pins={pins} />
    </Suspense>
  );
};

export default LazyInteractiveMap;