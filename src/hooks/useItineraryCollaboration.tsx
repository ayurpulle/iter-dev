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

  const sendCollaborationChatMessage = useCallback(async (friendId: string, itineraryId: string, itineraryTitle: string) => {
    if (!user) return;
    
    try {
      console.log('Creating collaboration chat message for friend:', friendId, 'itinerary:', itineraryId);
      
      // Find or create conversation
      let conversationId = null;
      
      // Check if conversation already exists
      const { data: existingConv, error: searchError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id])
        .contains('participants', [friendId])
        .maybeSingle();

      if (searchError) {
        console.error('Error searching for existing conversation:', searchError);
        throw searchError;
      }

      if (existingConv) {
        conversationId = existingConv.id;
        console.log('Found existing conversation:', conversationId);
      } else {
        // Create new conversation
        console.log('Creating new conversation between:', user.id, 'and', friendId);
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participants: [user.id, friendId],
            last_message: `Collaboration invite: ${itineraryTitle}`,
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }
        conversationId = newConv.id;
        console.log('Created new conversation:', conversationId);
      }

      // Create collaboration message
      const shareMessage = `🤝 I invited you to collaborate on: "${itineraryTitle}"`;
      const messageData = { 
        type: 'collaboration_invite', 
        itinerary_id: itineraryId,
        itinerary_title: itineraryTitle 
      };

      console.log('Sending collaboration message to conversation:', conversationId);
      // Send the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: shareMessage,
          metadata: messageData
        });

      if (messageError) {
        console.error('Error sending message:', messageError);
        throw messageError;
      }

      // Update conversation last message
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message: shareMessage,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error updating conversation:', updateError);
        throw updateError;
      }

      console.log('Successfully sent collaboration chat message');
    } catch (error) {
      console.error('Error sending collaboration chat message:', error);
    }
  }, [user]);

  const shareItinerary = useCallback(async (itineraryId: string, friendIds: string[], itineraryTitle?: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      console.log('Sharing itinerary with friends:', friendIds, 'title:', itineraryTitle);
      
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

      // Send collaboration chat messages to each friend
      console.log('Sending chat messages to friends...');
      for (const friendId of friendIds) {
        await sendCollaborationChatMessage(friendId, itineraryId, itineraryTitle || 'Itinerary');
      }

      toast({
        title: "Success",
        description: `Collaboration invites sent to ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}!`
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
  }, [user, toast, sendCollaborationChatMessage]);

  return {
    inviteCollaborator,
    respondToInvite,
    removeCollaborator,
    getItineraryCollaborators,
    shareItinerary,
    loading
  };
};