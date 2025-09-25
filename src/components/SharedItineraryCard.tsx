import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Eye, Edit } from 'lucide-react';
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
  messageType?: 'shared_itinerary' | 'collaboration_invite';
  invitedBy?: string; // ID of the user who sent the invite
}

export const SharedItineraryCard = ({ itineraryId, itineraryTitle, itineraryContent, messageType = 'shared_itinerary', invitedBy }: SharedItineraryCardProps) => {
  const navigate = useNavigate();
  const { savedItineraries, saveItinerary } = useSavedItineraries();
  const { respondToInvite } = useItineraryCollaboration();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleViewItinerary = async () => {
    try {
      if (!user) return;

      if (messageType === 'collaboration_invite') {
        // For collaboration invites, check if there's a pending invite and accept it
        const { data: existingInvite } = await supabase
          .from('itinerary_collaborators')
          .select('id')
          .eq('itinerary_id', itineraryId)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single();

        if (existingInvite) {
          // Accept the collaboration invite
          await respondToInvite(existingInvite.id, 'accepted');
        } else {
          // If no pending invite, create a collaboration record
          await supabase
            .from('itinerary_collaborators')
            .upsert({
              itinerary_id: itineraryId,
              user_id: user.id,
              permission: 'edit',
              invited_by: invitedBy || user.id,
              status: 'accepted'
            }, {
              onConflict: 'itinerary_id,user_id'
            });
        }
      } else {
        // For shared itineraries, create a view-only collaboration record
        await supabase
          .from('itinerary_collaborators')
          .upsert({
            itinerary_id: itineraryId,
            user_id: user.id,
            permission: 'view',
            invited_by: invitedBy || user.id,
            status: 'accepted'
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
          {messageType === 'collaboration_invite' ? (
            <Edit className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Eye className="h-5 w-5 text-muted-foreground" />
          )}
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {messageType === 'collaboration_invite' ? 'Collaboration Invite' : 'Shared Itinerary'}
          </Badge>
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground leading-tight">
          {itineraryTitle}
        </h3>
        
        {/* Subtitle */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {messageType === 'collaboration_invite' 
              ? 'Tap to view and edit' 
              : 'Tap to view full itinerary'
            }
          </span>
        </div>
        
        {/* Action button */}
        <Button 
          size="lg" 
          className="w-full bg-muted hover:bg-muted/80 text-muted-foreground"
          onClick={handleViewItinerary}
        >
          {messageType === 'collaboration_invite' ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              View & Edit
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              View Itinerary
            </>
          )}
        </Button>
      </div>
    </div>
  );
};