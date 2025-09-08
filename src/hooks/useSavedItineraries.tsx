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
      return client
        .from('saved_itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
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
  }) => {
    setLoading(true);
    setError(null);

    const result = await executeQuery<SavedItinerary>(async (client) => {
      // Get fresh user from current session instead of potentially stale React context
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in again.');
      }

      const insertData = {
        user_id: session.user.id, // Use fresh session user, not React context user
        title: itineraryData.title,
        destination: itineraryData.destination,
        start_date: itineraryData.start_date?.toISOString().split('T')[0] || null,
        end_date: itineraryData.end_date?.toISOString().split('T')[0] || null,
        budget: itineraryData.budget || null,
        interests: itineraryData.interests || [],
        itinerary_content: itineraryData.itinerary_content,
        friend_recommendations: itineraryData.friend_recommendations || {}
      };
      
      return client
        .from('saved_itineraries')
        .insert(insertData)
        .select()
        .single();
    });
    
    setLoading(false);
    
    if (result) {
      toast({
        title: "Iter Saved!",
        description: "Your iter has been saved successfully.",
      });
      fetchSavedItineraries();
      return result;
    }
    
    return null;
  };

  const deleteItinerary = async (id: string) => {
    if (!user) return false;

    const result = await executeQuery(async (client) => {
      return client
        .from('saved_itineraries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    });

    if (result !== null) {
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
        .eq('user_id', user.id)
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