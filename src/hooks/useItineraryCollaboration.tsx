import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface ItineraryCollaborator {
  id: string;
  itinerary_id: string;
  user_id: string;
  permission: 'view' | 'edit' | 'admin';
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    username: string;
    avatar: string;
  };
}

export const useItineraryCollaboration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const inviteCollaborator = useCallback(async (
    itineraryId: string, 
    friendId: string, 
    permission: 'view' | 'edit' | 'admin' = 'view'
  ) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to invite collaborators",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use upsert to handle existing collaborations gracefully
      const { data, error } = await supabase
        .from('itinerary_collaborators')
        .upsert({
          itinerary_id: itineraryId,
          user_id: friendId,
          permission,
          invited_by: user.id,
          status: 'pending' // Reset to pending if it was declined before
        }, {
          onConflict: 'itinerary_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collaboration invite sent!"
      });

      return data;
    } catch (error: any) {
      console.error('Error inviting collaborator:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite collaborator",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const respondToInvite = useCallback(async (
    collaborationId: string,
    status: 'accepted' | 'declined'
  ) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('itinerary_collaborators')
        .update({ status })
        .eq('id', collaborationId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Collaboration invite ${status}!`
      });

      // If accepted, emit an event to refresh saved itineraries
      if (status === 'accepted') {
        // Emit a custom event that the useSavedItineraries hook can listen to
        window.dispatchEvent(new CustomEvent('itinerary-collaboration-accepted'));
      }

      return true;
    } catch (error: any) {
      console.error('Error responding to invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to respond to invite",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const removeCollaborator = useCallback(async (collaborationId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('itinerary_collaborators')
        .delete()
        .eq('id', collaborationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collaborator removed"
      });

      return true;
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove collaborator",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const getItineraryCollaborators = useCallback(async (itineraryId: string) => {
    try {
      // First get collaborators
      const { data: collaborators, error: collabError } = await supabase
        .from('itinerary_collaborators')
        .select('*')
        .eq('itinerary_id', itineraryId)
        .order('created_at', { ascending: false });

      if (collabError) throw collabError;

      // Then get profile data for each collaborator
      if (collaborators && collaborators.length > 0) {
        const userIds = collaborators.map(c => c.user_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, name, username, avatar')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        // Combine the data
        const collaboratorsWithProfiles = collaborators.map(collab => ({
          ...collab,
          profiles: profiles?.find(p => p.user_id === collab.user_id) || null
        }));

        return collaboratorsWithProfiles as ItineraryCollaborator[];
      }

      return collaborators as ItineraryCollaborator[];
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      return [];
    }
  }, []);

  const shareItinerary = useCallback(async (itineraryId: string, friendIds: string[]) => {
    if (!user) return;

    setLoading(true);
    try {
      const invites = friendIds.map(friendId => ({
        itinerary_id: itineraryId,
        user_id: friendId,
        permission: 'view' as const,
        invited_by: user.id,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('itinerary_collaborators')
        .upsert(invites, {
          onConflict: 'itinerary_id,user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Itinerary shared with ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}!`
      });

      return true;
    } catch (error: any) {
      console.error('Error sharing itinerary:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share itinerary",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return {
    inviteCollaborator,
    respondToInvite,
    removeCollaborator,
    getItineraryCollaborators,
    shareItinerary,
    loading
  };
};