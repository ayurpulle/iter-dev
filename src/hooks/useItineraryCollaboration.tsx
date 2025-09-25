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
      // Check if collaboration already exists
      const { data: existingCollab } = await supabase
        .from('itinerary_collaborators')
        .select('id, status')
        .eq('itinerary_id', itineraryId)
        .eq('user_id', friendId)
        .maybeSingle();

      if (existingCollab) {
        toast({
          title: "Already Invited",
          description: "User already invited for collaboration!",
          variant: "destructive"
        });
        return null;
      }

      // Use insert instead of upsert to avoid RLS issues
      const { data, error } = await supabase
        .from('itinerary_collaborators')
        .insert({
          itinerary_id: itineraryId,
          user_id: friendId,
          permission,
          invited_by: user.id,
          status: 'pending'
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

  const sendChatMessage = useCallback(async (
    friendId: string, 
    itineraryId: string, 
    itineraryTitle: string, 
    isCollaboration: boolean = false
  ) => {
    if (!user) return;
    
    try {
      console.log('Creating chat message for friend:', friendId, 'itinerary:', itineraryId, 'collaboration:', isCollaboration);
      
      // Validate that we have different user IDs
      if (user.id === friendId) {
        console.error('Cannot create conversation with self');
        return;
      }
      
      // Find or create conversation
      let conversationId = null;
      
      // Check if conversation already exists - get all conversations
      const { data: conversations, error: searchError } = await supabase
        .from('conversations')
        .select('id, participants');

      let existingConv = null;
      if (conversations && !searchError) {
        // Find conversation that contains exactly both users
        existingConv = conversations.find(conv => {
          const participants = conv.participants || [];
          return participants.length === 2 && 
                 participants.includes(user.id) && 
                 participants.includes(friendId);
        });
      }

      if (searchError) {
        console.error('Error searching for existing conversation:', searchError);
        throw searchError;
      }

      if (existingConv) {
        conversationId = existingConv.id;
        console.log('Found existing conversation:', conversationId);
      } else {
        // Create new conversation
        const messagePreview = isCollaboration 
          ? `Collaboration invite: ${itineraryTitle}`
          : `Shared itinerary: ${itineraryTitle}`;
          
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participants: [user.id, friendId],
            created_by: user.id,
            last_message: messagePreview,
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

      // Create message with proper metadata
      const shareMessage = isCollaboration 
        ? `🤝 I invited you to collaborate on: "${itineraryTitle}"`
        : `🗺️ I shared an itinerary with you: "${itineraryTitle}"`;
        
      const messageData = { 
        type: isCollaboration ? 'collaboration_invite' : 'shared_itinerary', 
        itinerary_id: itineraryId,
        itinerary_title: itineraryTitle 
      };

      console.log('Sending message to conversation:', conversationId);
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

      console.log('Successfully sent chat message');
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }, [user]);

  const shareItinerary = useCallback(async (itineraryId: string, friendIds: string[], itineraryTitle?: string, permission: 'view' | 'edit' = 'edit') => {
    if (!user) return false;

    setLoading(true);
    try {
      console.log('Sharing itinerary with friends:', friendIds, 'title:', itineraryTitle, 'permission:', permission);
      
      const isCollaboration = permission === 'edit';
      
      if (isCollaboration) {
        // For collaboration, create collaborator records
        const invites = friendIds.map(friendId => ({
          itinerary_id: itineraryId,
          user_id: friendId,
          permission: permission,
          invited_by: user.id,
          status: 'pending'
        }));

        // Check for existing collaborations first
        const { data: existingCollabs } = await supabase
          .from('itinerary_collaborators')
          .select('user_id')
          .eq('itinerary_id', itineraryId)
          .in('user_id', friendIds);

        const existingUserIds = existingCollabs?.map(c => c.user_id) || [];
        const newInvites = invites.filter(invite => !existingUserIds.includes(invite.user_id));

        if (newInvites.length === 0) {
          toast({
            title: "Already Invited",
            description: "User already invited for collaboration!",
            variant: "destructive"
          });
          return false;
        }

        const { error } = await supabase
          .from('itinerary_collaborators')
          .insert(newInvites);

        if (error) throw error;

        // Send collaboration chat messages only to successfully invited friends
        const newFriendIds = newInvites.map(invite => invite.user_id);
        for (const friendId of newFriendIds) {
          await sendChatMessage(friendId, itineraryId, itineraryTitle || 'Itinerary', true);
        }
      } else {
        // For view-only sharing, just send chat messages without creating collaborator records
        for (const friendId of friendIds) {
          await sendChatMessage(friendId, itineraryId, itineraryTitle || 'Itinerary', false);
        }
      }

      const totalInvited = friendIds.length;
      toast({
        title: "Success",
        description: `${isCollaboration ? 'Collaboration' : 'Sharing'} invites sent to ${totalInvited} friend${totalInvited > 1 ? 's' : ''}!`
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
  }, [user, toast, sendChatMessage]);

  return {
    inviteCollaborator,
    respondToInvite,
    removeCollaborator,
    getItineraryCollaborators,
    shareItinerary,
    loading
  };
};