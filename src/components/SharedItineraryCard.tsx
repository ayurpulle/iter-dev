import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useSavedItineraries } from '@/hooks/useSavedItineraries';
import { useItineraryCollaboration } from '@/hooks/useItineraryCollaboration';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SharedItineraryCardProps {
  itineraryId: string;
  itineraryTitle: string;
  itineraryContent?: string;
}

export const SharedItineraryCard = ({ itineraryId, itineraryTitle, itineraryContent }: SharedItineraryCardProps) => {
  const navigate = useNavigate();
  const { savedItineraries, saveItinerary } = useSavedItineraries();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleViewItinerary = async () => {
    try {
      // Create a view-only collaboration record so the user can access the itinerary
      if (user) {
        await supabase
          .from('itinerary_collaborators')
          .upsert({
            itinerary_id: itineraryId,
            user_id: user.id,
            permission: 'view',
            invited_by: user.id, // For shared items, mark them as self-invited
            status: 'accepted' // Auto-accept for shared items
          }, {
            onConflict: 'itinerary_id,user_id'
          });
      }
      
      // Navigate to view the itinerary
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
          <Eye className="h-5 w-5 text-muted-foreground" />
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
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
          className="w-full bg-muted hover:bg-muted/80 text-muted-foreground"
          onClick={handleViewItinerary}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Itinerary
        </Button>
      </div>
    </div>
  );
};