import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

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
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  console.log('useSavedItineraries hook - user state:', { 
    hasUser: !!user, 
    userId: user?.id, 
    hasSession: !!session,
    sessionValid: !!session?.access_token
  });

  const fetchSavedItineraries = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('saved_itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedItineraries(data || []);
    } catch (err: any) {
      console.error('Error fetching saved iters:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

    try {
      // Use the database function that handles authentication properly
      const { data, error } = await supabase.rpc('save_user_itinerary', {
        p_title: itineraryData.title,
        p_destination: itineraryData.destination,
        p_start_date: itineraryData.start_date?.toISOString().split('T')[0] || null,
        p_end_date: itineraryData.end_date?.toISOString().split('T')[0] || null,
        p_budget: itineraryData.budget || null,
        p_interests: itineraryData.interests || [],
        p_itinerary_content: itineraryData.itinerary_content,
        p_friend_recommendations: itineraryData.friend_recommendations || {}
      });

      if (error) throw error;

      toast({
        title: "Iter Saved!",
        description: "Your iter has been saved successfully.",
      });

      // Refresh the list
      fetchSavedItineraries();
      return { id: data };
    } catch (err: any) {
      console.error('Error saving iter:', err);
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save iter. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteItinerary = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_itineraries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Iter Deleted",
        description: "Your iter has been deleted successfully.",
      });

      // Refresh the list
      fetchSavedItineraries();
      return true;
    } catch (err: any) {
      console.error('Error deleting iter:', err);
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete iter. Please try again.",
        variant: "destructive"
      });
      return false;
    }
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

    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      toast({
        title: "Iter Updated!",
        description: "Your iter has been updated successfully.",
      });

      // Refresh the list
      fetchSavedItineraries();
      return data;
    } catch (err: any) {
      console.error('Error updating iter:', err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update iter. Please try again.",
        variant: "destructive"
      });
      return null;
    }
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