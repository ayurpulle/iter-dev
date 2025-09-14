import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PhotoDetail {
  url: string;
  caption: string;
  budget: string;
  tagged_friends: string[];
  location?: string;
  tags: string[];
}

export interface TripData {
  title: string;
  description: string;
  country_code: string;
  cost?: string;
  companions?: string;
  taggedFriends?: string[];
  duration?: string;
  distance?: string;
  route: Array<{lat: number, lng: number, name: string}>;
  photos: string[];
  photo_details?: PhotoDetail[];
  is_public?: boolean;
}

export const useTrips = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadTripPhotos = async (photos: string[], tripId: string, userId: string) => {
    const uploadedResults: Array<{url: string | null, originalIndex: number}> = [];
    
    // Process photos with proper error handling and retries
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        // Convert data URL to blob
        const response = await fetch(photo);
        const blob = await response.blob();
        
        // Limit file size to prevent timeouts
        if (blob.size > 10 * 1024 * 1024) { // 10MB limit
          console.warn(`Photo ${i + 1} is too large (${blob.size} bytes), skipping`);
          uploadedResults.push({url: null, originalIndex: i});
          continue;
        }
        
        const fileName = `${tripId}/photo-${i + 1}-${Date.now()}.jpg`;
        const filePath = `${userId}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('trip-photos')
          .upload(filePath, blob, {
            upsert: true, // Allow overwriting
            contentType: 'image/jpeg'
          });
          
        if (error) {
          console.error(`Error uploading photo ${i + 1}:`, error);
          uploadedResults.push({url: null, originalIndex: i});
          continue; // Skip this photo but continue with others
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-photos')
          .getPublicUrl(filePath);
          
        uploadedResults.push({url: publicUrl, originalIndex: i});
        console.log(`Photo ${i + 1} uploaded successfully`);
      } catch (err) {
        console.error(`Error processing photo ${i + 1}:`, err);
        uploadedResults.push({url: null, originalIndex: i});
        // Continue with other photos even if one fails
      }
    }
    
    console.log(`Successfully uploaded ${uploadedResults.filter(r => r.url).length} out of ${photos.length} photos`);
    return uploadedResults;
  };

  const createTrip = async (tripData: TripData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('=== DEBUG: useTrips createTrip called ===');
      console.log('Creating trip with data:', tripData);
      console.log('tripData.route (will be saved as stops):', tripData.route);
      console.log('tripData.route length:', tripData.route?.length);
      console.log('User ID:', user.id);

      // First, upload photos in smaller batches to avoid timeout
      let imageUrls: string[] = [];
      let uploadResults: Array<{url: string | null, originalIndex: number}> = [];
      if (tripData.photos.length > 0) {
        console.log('Uploading photos in batches:', tripData.photos.length);
        const tempId = `temp-${Date.now()}`;
        
        // Upload photos sequentially to maintain order for photo details mapping
        uploadResults = await uploadTripPhotos(tripData.photos, tempId, user.id);
        imageUrls = uploadResults.filter(result => result.url).map(result => result.url!);
        console.log('Photos uploaded:', imageUrls);
      }

      // Map photo details to match successfully uploaded images
      const simplifiedPhotoDetails: any[] = [];
      if (tripData.photo_details && uploadResults.length > 0) {
        // Create photo details array matching the successfully uploaded images
        uploadResults.forEach((result) => {
          if (result.url && tripData.photo_details[result.originalIndex]) {
            simplifiedPhotoDetails.push({
              caption: tripData.photo_details[result.originalIndex].caption || '',
              budget: tripData.photo_details[result.originalIndex].budget || '',
              tagged_friends: tripData.photo_details[result.originalIndex].tagged_friends || [],
              location: tripData.photo_details[result.originalIndex].location || '',
              tags: tripData.photo_details[result.originalIndex].tags || []
            });
          }
        });
      }

      // Create trip record with minimal data first
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          title: tripData.title,
          description: tripData.description,
          country_code: tripData.country_code,
          cost: tripData.cost,
          companions: tripData.companions,
          duration: tripData.duration,
          distance: tripData.distance || '',
          stops: tripData.route,
          photo_count: imageUrls.length,
          images: imageUrls,
          is_public: tripData.is_public || false,
          user_id: user.id
        })
        .select()
        .single();

      if (tripError) {
        console.error('Trip creation error:', tripError);
        throw tripError;
      }

      console.log('Trip created successfully:', trip);

      // Update with photo details in a separate transaction if we have them
      if (simplifiedPhotoDetails.length > 0) {
        console.log('Saving photo details to database:', simplifiedPhotoDetails);
        const { error: updateError } = await supabase
          .from('trips')
          .update({ 
            photo_details: simplifiedPhotoDetails,
            tagged_friends: tripData.taggedFriends || []
          })
          .eq('id', trip.id);
          
        if (updateError) {
          console.error('Error updating trip with photo details:', updateError);
          // Don't throw - trip was created successfully
        }
      }

      // Handle tagged friends and post creation in background (non-blocking)
      const backgroundTasks = async () => {
        try {
          // Create trip tags for tagged friends
          if (tripData.taggedFriends && tripData.taggedFriends.length > 0) {
            console.log('Creating trip tags for:', tripData.taggedFriends);
            
            const { data: taggedUsers } = await supabase
              .from('profiles')
              .select('user_id')
              .in('username', tripData.taggedFriends);
            
            if (taggedUsers && taggedUsers.length > 0) {
              const tripTags = taggedUsers.map(taggedUser => ({
                trip_id: trip.id,
                user_id: user.id,
                tagged_user_id: taggedUser.user_id
              }));
              
              await supabase.from('trip_tags').insert(tripTags);
              console.log('Trip tags created successfully');
            }
          }

          // Create a post for the trip
          console.log('Creating post for trip');
          await supabase
            .from('posts')
            .insert({
              user_id: user.id,
              trip_id: trip.id,
              content: tripData.description,
              image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
              is_private: !tripData.is_public
            });
          console.log('Post created successfully');
        } catch (err) {
          console.error('Background task error (non-critical):', err);
        }
      };

      // Run background tasks without waiting
      backgroundTasks();

      console.log('Returning trip:', { ...trip, images: imageUrls });
      return { ...trip, images: imageUrls };
    } catch (err) {
      console.error('Trip creation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create trip';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserTrips = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: trips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return trips;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trips';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getPublicTrips = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles:user_id (
            name,
            username,
            avatar
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return trips;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch public trips';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAllVisibleTrips = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles:user_id (
            name,
            username,
            avatar
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return trips;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trips';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTrip,
    getUserTrips,
    getPublicTrips,
    getAllVisibleTrips,
    loading,
    error
  };
};