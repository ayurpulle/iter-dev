import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface SharedItineraryCardProps {
  itineraryId: string;
  itineraryTitle: string;
}

export const SharedItineraryCard = ({ itineraryId, itineraryTitle }: SharedItineraryCardProps) => {
  const navigate = useNavigate();

  const handleViewItinerary = () => {
    // Navigate to the trip planning page with the shared itinerary
    navigate(`/?viewIter=${itineraryId}`);
  };

  return (
    <Card className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={handleViewItinerary}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
            Shared Itinerary
          </Badge>
        </div>
        <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
          {itineraryTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Calendar className="h-4 w-4" />
            <span>Tap to view full itinerary</span>
          </div>
          <Button 
            size="sm" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleViewItinerary();
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Itinerary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};