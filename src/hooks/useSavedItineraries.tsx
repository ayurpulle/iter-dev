import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useAuthenticatedSupabase } from "./useAuthenticatedSupabase";

interface SavedItinerary {
  id: string;
  title: string;
  destination: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  interests?: string[] | null;
  itinerary_content: string;
  friend_recommendations?: any; // Using any to match Json type from Supabase
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const useSavedItineraries = () => {
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { executeQuery } = useAuthenticatedSupabase();

  const fetchSavedItineraries = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const data = await executeQuery<SavedItinerary[]>(async (client) => {
      // Fetch both owned itineraries and collaborative ones
      const { data: ownedItineraries, error: ownedError } = await client
        .from('saved_itineraries')
        .select('*')
        .eq('user_id', user.id);

      if (ownedError) throw ownedError;

      // Fetch collaborative itineraries
      const { data: collaborativeItineraries, error: collabError } = await client
        .from('saved_itineraries')
        .select(`
          *,
          itinerary_collaborators!inner(
            permission,
            status
          )
        `)
        .eq('itinerary_collaborators.user_id', user.id)
        .eq('itinerary_collaborators.status', 'accepted');

      if (collabError) throw collabError;

      // Combine and deduplicate results
      const allItineraries = [...(ownedItineraries || [])];
      
      if (collaborativeItineraries) {
        collaborativeItineraries.forEach(iter => {
          // Only add if not already in owned itineraries
          if (!allItineraries.find(owned => owned.id === iter.id)) {
            allItineraries.push(iter);
          }
        });
      }

      return { data: allItineraries.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ), error: null };
    });

    if (data) {
      setSavedItineraries(data);
    }
    setLoading(false);
  };

  const saveItinerary = async (itineraryData: {
    title: string;
    destination: string;
    start_date?: Date | null;
    end_date?: Date | null;
    budget?: number;
    interests?: string[];
    itinerary_content: string;
    friend_recommendations?: { [key: string]: any[] };
  }, showToast: boolean = true) => {
    setLoading(true);
    setError(null);

    const result = await executeQuery<string>(async (client) => {
      // Use the database function that handles auth server-side
      return client.rpc('save_user_itinerary', {
        p_title: itineraryData.title,
        p_destination: itineraryData.destination,
        p_start_date: itineraryData.start_date?.toISOString().split('T')[0] || null,
        p_end_date: itineraryData.end_date?.toISOString().split('T')[0] || null,
        p_budget: itineraryData.budget || null,
        p_interests: itineraryData.interests || [],
        p_itinerary_content: itineraryData.itinerary_content,
        p_friend_recommendations: itineraryData.friend_recommendations || {}
      });
    });
    
    setLoading(false);
    
    if (result) {
      if (showToast) {
        toast({
          title: "Iter Saved!",
          description: "Your iter has been saved successfully.",
        });
      }
      fetchSavedItineraries();
      return { id: result };
    }
    
    return null;
  };

  const deleteItinerary = async (id: string) => {
    if (!user) return false;

    setLoading(true);
    const result = await executeQuery(async (client) => {
      // First check if user has permission to delete (must be owner)
      const { data: itinerary, error: fetchError } = await client
        .from('saved_itineraries')
        .select('user_id')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle instead of single to handle missing rows

      if (fetchError) throw fetchError;
      
      // If itinerary doesn't exist, consider it already deleted
      if (!itinerary) {
        return { data: null, error: null }; // Return success since it's already gone
      }
      
      if (itinerary.user_id !== user.id) {
        throw new Error('You can only delete your own itineraries');
      }

      // Delete the itinerary
      return client
        .from('saved_itineraries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Extra safety check
    });

    setLoading(false);
    if (result) {
      toast({
        title: "Iter Deleted",
        description: "Your iter has been deleted successfully.",
      });
      fetchSavedItineraries();
      return true;
    }
    return false;
  };

  const updateItinerary = async (id: string, itineraryData: {
    title: string;
    destination: string;
    start_date?: Date | null;
    end_date?: Date | null;
    budget?: number;
    interests?: string[];
    itinerary_content: string;
    friend_recommendations?: { [key: string]: any[] };
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to update iters.",
        variant: "destructive"
      });
      return null;
    }

    const result = await executeQuery(async (client) => {
      // Check if user has edit permissions using the database function
      const { data: permissions } = await client
        .rpc('get_user_itinerary_permissions', {
          itinerary_uuid: id,
          user_uuid: user.id
        });

      if (!permissions?.can_edit) {
        throw new Error('You do not have permission to edit this itinerary');
      }

      return client
        .from('saved_itineraries')
        .update({
          title: itineraryData.title,
          destination: itineraryData.destination,
          start_date: itineraryData.start_date?.toISOString().split('T')[0] || null,
          end_date: itineraryData.end_date?.toISOString().split('T')[0] || null,
          budget: itineraryData.budget || null,
          interests: itineraryData.interests || [],
          itinerary_content: itineraryData.itinerary_content,
          friend_recommendations: itineraryData.friend_recommendations || {}
        })
        .eq('id', id)
        .select()
        .single();
    });

    if (result) {
      toast({
        title: "Iter Updated!",
        description: "Your iter has been updated successfully.",
      });
      fetchSavedItineraries();
    }

    return result;
  };

  useEffect(() => {
    if (user) {
      fetchSavedItineraries();
    }
  }, [user]);

  return {
    savedItineraries,
    loading,
    error,
    updateItinerary,
    saveItinerary,
    deleteItinerary,
    refetch: fetchSavedItineraries
  };
};