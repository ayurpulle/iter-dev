import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useSavedItineraries } from '@/hooks/useSavedItineraries';
import { useToast } from '@/hooks/use-toast';

interface SharedItineraryCardProps {
  itineraryId: string;
  itineraryTitle: string;
  itineraryContent?: string;
}

export const SharedItineraryCard = ({ itineraryId, itineraryTitle, itineraryContent }: SharedItineraryCardProps) => {
  const navigate = useNavigate();
  const { savedItineraries, saveItinerary } = useSavedItineraries();
  const { toast } = useToast();

  const handleViewItinerary = async () => {
    try {
      // Check if itinerary already exists in saved itineraries
      const existingIter = savedItineraries.find(iter => iter.id === itineraryId);
      
      if (!existingIter) {
        // If it doesn't exist, save it first
        if (itineraryContent) {
          await saveItinerary({
            title: itineraryTitle,
            destination: "Shared Location", // Will be updated when viewed
            itinerary_content: itineraryContent
          }, false); // Don't show toast for automatic save
        }
      }
      
      // Navigate to home with parameters to show saved trips and open this itinerary
      navigate(`/?view=savedTrips&openIter=${itineraryId}`);
    } catch (error) {
      console.error('Error handling shared itinerary:', error);
      toast({
        title: "Error",
        description: "Failed to open shared itinerary",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className="space-y-4">
        {/* Header with badge */}
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
            Shared Itinerary
          </Badge>
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground leading-tight">
          {itineraryTitle}
        </h3>
        
        {/* Subtitle */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Tap to view full itinerary</span>
        </div>
        
        {/* Action button */}
        <Button 
          size="lg" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleViewItinerary}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Collaborate on
        </Button>
      </div>
    </div>
  );
};