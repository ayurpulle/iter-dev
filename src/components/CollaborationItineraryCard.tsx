import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, Eye, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useSavedItineraries } from '@/hooks/useSavedItineraries';
import { useToast } from '@/hooks/use-toast';
import { useItineraryCollaboration } from '@/hooks/useItineraryCollaboration';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CollaborationItineraryCardProps {
  itineraryId: string;
  itineraryTitle: string;
  itineraryContent?: string;
}

export const CollaborationItineraryCard = ({ itineraryId, itineraryTitle, itineraryContent }: CollaborationItineraryCardProps) => {
  const navigate = useNavigate();
  const { savedItineraries, saveItinerary } = useSavedItineraries();
  const { toast } = useToast();
  const { respondToInvite } = useItineraryCollaboration();
  const { user } = useAuth();
  const [collaboration, setCollaboration] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch collaboration details on mount
  useEffect(() => {
    const fetchCollaboration = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('itinerary_collaborators')
          .select('*')
          .eq('itinerary_id', itineraryId)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (error) throw error;
        setCollaboration(data);
      } catch (error) {
        console.error('Error fetching collaboration:', error);
      }
    };

    fetchCollaboration();
  }, [itineraryId, user]);

  const handleAcceptInvite = async () => {
    if (!collaboration) return;
    
    setLoading(true);
    try {
      // Accept the collaboration invite
      const success = await respondToInvite(collaboration.id, 'accepted');
      
      if (success) {
        // Navigate to view the itinerary
        navigate(`/?view=savedTrips&openIter=${itineraryId}`);
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: "Error",
        description: "Failed to accept collaboration invite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!collaboration) return;
    
    setLoading(true);
    try {
      await respondToInvite(collaboration.id, 'declined');
      toast({
        title: "Declined",
        description: "Collaboration invite declined",
      });
    } catch (error) {
      console.error('Error declining invite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className="space-y-4">
        {/* Header with badge */}
        <div className="flex items-center gap-2">
          {collaboration?.permission === 'view' ? (
            <Eye className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Edit className="h-5 w-5 text-primary" />
          )}
          <Badge 
            variant="secondary" 
            className={collaboration?.permission === 'view' 
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/20" 
            }
          >
            {collaboration?.permission === 'view' ? 'View Invite' : 'Collaboration Invite'}
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
            {collaboration?.permission === 'view' 
              ? 'You can view this itinerary'
              : 'You can view and edit this itinerary' 
            }
          </span>
        </div>
        
        {/* Action buttons */}
        {collaboration && collaboration.status === 'pending' ? (
          <div className="flex gap-2">
            <Button 
              size="lg" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleAcceptInvite}
              disabled={loading}
            >
              {collaboration.permission === 'view' ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Accept & View
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Accept & Edit
                </>
              )}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={handleDeclineInvite}
              disabled={loading}
            >
              Decline
            </Button>
          </div>
        ) : (
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => navigate(`/?view=savedTrips&openIter=${itineraryId}`)}
          >
            {collaboration?.permission === 'view' ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View Only
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                View & Edit
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};