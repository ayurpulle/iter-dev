import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useAuthenticatedSupabase } from "./useAuthenticatedSupabase";

export interface SavedItinerary {
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
  creator_username?: string;
  creator_name?: string;
  is_owner?: boolean;
  can_edit?: boolean;
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
      // Fetch both owned itineraries and collaborative ones with creator profile info
      const { data: ownedItineraries, error: ownedError } = await client
        .from('saved_itineraries')
        .select(`
          *,
          profiles!saved_itineraries_user_id_fkey(username, name)
        `)
        .eq('user_id', user.id);

      if (ownedError) throw ownedError;

      // Fetch collaborative itineraries with creator profile info
      // First get collaboration records for the current user
      const { data: userCollaborations, error: userCollabError } = await client
        .from('itinerary_collaborators')
        .select('itinerary_id, permission, status, user_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (userCollabError) throw userCollabError;

      let collaborativeItineraries = [];
      let collaborativeTrips = [];
      
      if (userCollaborations && userCollaborations.length > 0) {
        const itineraryIds = userCollaborations.map(collab => collab.itinerary_id);
        
        // Fetch from saved_itineraries table
        const { data: collabItineraries, error: collabError } = await client
          .from('saved_itineraries')
          .select(`
            *,
            profiles!saved_itineraries_user_id_fkey(username, name)
          `)
          .in('id', itineraryIds);

        if (collabError) throw collabError;
        
        // Fetch from trips table (for shared trips)
        const { data: collabTripsData, error: collabTripsError } = await client
          .from('trips')
          .select(`
            id,
            title,
            destination,
            start_date,
            end_date,
            cost,
            hashtags,
            overall_budget,
            description,
            created_at,
            updated_at,
            user_id,
            profiles!trips_user_id_profiles_fkey(username, name)
          `)
          .in('id', itineraryIds);

        if (collabTripsError) throw collabTripsError;
        
        // Combine itinerary data with collaboration info
        collaborativeItineraries = (collabItineraries || []).map(iter => {
          const collaboration = userCollaborations.find(collab => collab.itinerary_id === iter.id);
          return {
            ...iter,
            itinerary_collaborators: collaboration
          };
        });

        // Combine trip data with collaboration info and convert to itinerary format
        collaborativeTrips = (collabTripsData || []).map(trip => {
          const collaboration = userCollaborations.find(collab => collab.itinerary_id === trip.id);
          
          // Extract budget from overall_budget field (same as background trips)
          let budget = null;
          if (trip.overall_budget && typeof trip.overall_budget === 'number') {
            budget = trip.overall_budget;
          }
          
          console.log('Processing collaborative trip:', {
            tripId: trip.id,
            title: trip.title,
            overall_budget: trip.overall_budget,
            mappedBudget: budget,
            hashtags: trip.hashtags
          });
          
          return {
            id: trip.id,
            title: trip.title,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            budget: budget, // Map from overall_budget instead of hardcoding to null
            interests: trip.hashtags || [], // Map from hashtags field
            itinerary_content: trip.description || '',
            friend_recommendations: {},
            created_at: trip.created_at,
            updated_at: trip.updated_at,
            user_id: trip.user_id,
            profiles: trip.profiles,
            itinerary_collaborators: collaboration,
            is_from_trips_table: true // Flag to identify this came from trips table
          };
        });
      }

      // Fetch background-generated trips (from generate-itinerary edge function)
      // These are distinguished by having long, structured descriptions (>500 chars)
      const { data: backgroundTrips, error: tripsError } = await client
        .from('trips')
        .select(`
          id,
          title,
          destination,
          start_date,
          end_date,
          cost,
          hashtags,
          overall_budget,
          description,
          created_at,
          updated_at,
          user_id,
          profiles!trips_user_id_profiles_fkey(username, name)
        `)
        .eq('user_id', user.id)
        .not('description', 'is', null);

      if (tripsError) throw tripsError;

      // Process owned itineraries
      const processedOwned = (ownedItineraries || []).map(iter => ({
        ...iter,
        creator_username: iter.profiles?.username || 'Unknown',
        creator_name: iter.profiles?.name || 'Unknown User',
        is_owner: true,
        can_edit: true // Owner can always edit
      }));

      // Process collaborative itineraries and trips
      const processedCollaborative = [...(collaborativeItineraries || []), ...(collaborativeTrips || [])].map(iter => {
        console.log('Processing collaborative itinerary:', iter.title, 'collaborators:', iter.itinerary_collaborators);
        
        let collaboratorData = null;
        let hasEditPermission = false;
        
        if (iter.itinerary_collaborators) {
          if (Array.isArray(iter.itinerary_collaborators)) {
            // If it's an array, find the current user's collaboration
            collaboratorData = iter.itinerary_collaborators.find(collab => collab.user_id === user.id);
            if (!collaboratorData && iter.itinerary_collaborators.length > 0) {
              // Fallback to first if current user not found
              collaboratorData = iter.itinerary_collaborators[0];
            }
          } else {
            // If it's a single object, make sure it's for the current user
            if (iter.itinerary_collaborators.user_id === user.id) {
              collaboratorData = iter.itinerary_collaborators;
            }
          }
        }
        
        hasEditPermission = collaboratorData?.permission === 'edit' || collaboratorData?.permission === 'admin';
        
        console.log(`Collaborative iter ${iter.title}: collaboratorData=`, collaboratorData, 'hasEditPermission=', hasEditPermission, 'permission=', collaboratorData?.permission);
        
        return {
          ...iter,
          creator_username: iter.profiles?.username || 'Unknown',
          creator_name: iter.profiles?.name || 'Unknown User',
          is_owner: false,
          can_edit: hasEditPermission
        };
      });

      // Filter and process background-generated trips (only long descriptions are itineraries)
      const processedTrips = (backgroundTrips || [])
        .filter(trip => trip.description && trip.description.length > 500) // Only keep actual itineraries
        .map(trip => {
        // Extract budget from overall_budget field (which stores the encoded budget number)
        let budget = null;
        if (trip.overall_budget && typeof trip.overall_budget === 'number') {
          budget = trip.overall_budget;
        } else if (trip.cost && typeof trip.cost === 'string') {
          // Fallback: extract from cost string (e.g., "Budget Level 2" -> 2)
          const budgetMatch = trip.cost.match(/Budget Level (\d+)/);
          if (budgetMatch) {
            budget = parseInt(budgetMatch[1]);
          }
        }

        // Extract encoded holiday types from hashtags field
        const interests = trip.hashtags || [];

        console.log('Processing background trip:', {
          tripId: trip.id,
          originalHashtags: trip.hashtags,
          mappedInterests: interests ? [...interests] : [], // Create a copy to avoid circular reference
          originalOverallBudget: trip.overall_budget,
          mappedBudget: budget
        });

        return {
          id: trip.id,
          title: trip.title || trip.destination || 'Generated Trip',
          destination: trip.destination || 'Unknown Destination',
          start_date: trip.start_date,
          end_date: trip.end_date,
          budget: budget,
          interests: interests, // Map from hashtags field (contains encoded holiday types)
          itinerary_content: trip.description || '',
          friend_recommendations: {},
          created_at: trip.created_at,
          updated_at: trip.updated_at,
          user_id: trip.user_id,
          creator_username: trip.profiles?.username || 'Unknown',
          creator_name: trip.profiles?.name || 'Unknown User',
          is_owner: true,
          can_edit: true
        } as SavedItinerary;
      });

      // Combine and deduplicate results
      const allItineraries = [...processedOwned, ...processedTrips];
      
      processedCollaborative.forEach(iter => {
        // Only add if not already in owned itineraries
        if (!allItineraries.find(owned => owned.id === iter.id)) {
          allItineraries.push(iter);
        }
      });

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
    let isOwnerAction = false;
    const result = await executeQuery(async (client) => {
      // Check both tables to see which one contains this itinerary
      const { data: savedItinerary } = await client
        .from('saved_itineraries')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();

      const { data: tripItinerary } = await client
        .from('trips')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();

      // Check if user is a collaborator
      const { data: collaboration } = await client
        .from('itinerary_collaborators')
        .select('id')
        .eq('itinerary_id', id)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (savedItinerary) {
        if (savedItinerary.user_id === user.id) {
          // User owns the itinerary - delete it completely
          isOwnerAction = true;
          return client
            .from('saved_itineraries')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
        } else if (collaboration) {
          // User is a collaborator - remove collaboration record
          isOwnerAction = false;
          return client
            .from('itinerary_collaborators')
            .delete()
            .eq('id', collaboration.id);
        } else {
          throw new Error('You do not have access to this itinerary');
        }
      } else if (tripItinerary) {
        if (tripItinerary.user_id === user.id) {
          // User owns the trip - delete it completely
          isOwnerAction = true;
          return client
            .from('trips')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
        } else if (collaboration) {
          // User is a collaborator - remove collaboration record
          isOwnerAction = false;
          return client
            .from('itinerary_collaborators')
            .delete()
            .eq('id', collaboration.id);
        } else {
          throw new Error('You do not have access to this itinerary');
        }
      } else {
        // Itinerary doesn't exist, consider it already deleted
        return { data: null, error: null };
      }
    });

    setLoading(false);
    if (result) {
      toast({
        title: isOwnerAction ? "Iter Deleted" : "Iter Removed",
        description: isOwnerAction 
          ? "Your iter has been deleted successfully." 
          : "The iter has been removed from your saved list.",
      });
      // Immediately update the local state to remove the deleted itinerary
      setSavedItineraries(prev => prev.filter(iter => iter.id !== id));
      // Also refetch to ensure consistency
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
      console.log('Checking permissions for itinerary:', id, 'user:', user.id);
      const { data: permissions, error: permError } = await client
        .rpc('get_user_itinerary_permissions', {
          itinerary_uuid: id,
          user_uuid: user.id
        });

      console.log('Permission check result:', permissions, 'error:', permError);

      if (permError) {
        console.error('Permission check error:', permError);
        throw permError;
      }

      // Check permissions result, but don't fail immediately
      console.log('Permission check - can_edit:', permissions?.can_edit, 'full permissions:', permissions);

      // If permissions check fails, do a direct ownership check
      if (!permissions?.can_edit) {
        console.log('Permissions check failed, doing direct ownership check...');
        
        // Check if user owns this in saved_itineraries table
        const { data: savedItinerary, error: savedError } = await client
          .from('saved_itineraries')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();

        if (savedError) {
          console.error('Error checking saved itinerary ownership:', savedError);
        }

        // Check if user owns this in trips table
        const { data: tripItinerary, error: tripError } = await client
          .from('trips')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();

        if (tripError) {
          console.error('Error checking trip ownership:', tripError);
        }

        console.log('Direct ownership check - saved:', savedItinerary, 'trip:', tripItinerary);

        const isOwnerOfSaved = savedItinerary?.user_id === user.id;
        const isOwnerOfTrip = tripItinerary?.user_id === user.id;

        if (!isOwnerOfSaved && !isOwnerOfTrip) {
          throw new Error('You do not have permission to edit this itinerary');
        }
      }

      // First check which table contains this itinerary
      const { data: savedItinerary } = await client
        .from('saved_itineraries')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      const { data: tripItinerary } = await client
        .from('trips')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      

      if (savedItinerary) {
        // Update in saved_itineraries table
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
      } else if (tripItinerary) {
        // Update in trips table (background generated itineraries)
        return client
          .from('trips')
          .update({
            title: itineraryData.title,
            destination: itineraryData.destination,
            start_date: itineraryData.start_date?.toISOString().split('T')[0] || null,
            end_date: itineraryData.end_date?.toISOString().split('T')[0] || null,
            cost: itineraryData.budget ? `Budget Level ${itineraryData.budget}` : null,
            description: itineraryData.itinerary_content
          })
          .eq('id', id)
          .select()
          .single();
      } else {
        throw new Error('Itinerary not found in either table');
      }
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

  // Listen for collaboration acceptance events to refresh the list
  useEffect(() => {
    const handleCollaborationAccepted = () => {
      if (user) {
        fetchSavedItineraries();
      }
    };

    window.addEventListener('itinerary-collaboration-accepted', handleCollaborationAccepted);
    
    return () => {
      window.removeEventListener('itinerary-collaboration-accepted', handleCollaborationAccepted);
    };
  }, [user]);

  // Listen for collaboration acceptance events to refetch
  useEffect(() => {
    const handleCollaborationAccepted = () => {
      if (user) {
        fetchSavedItineraries();
      }
    };

    window.addEventListener('collaborationAccepted', handleCollaborationAccepted);
    return () => window.removeEventListener('collaborationAccepted', handleCollaborationAccepted);
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