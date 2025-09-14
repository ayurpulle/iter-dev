import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PhotoDetail {
  url: string;
  caption: string;
  budget: string;
  tagged_friends: string[];
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
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        // Convert data URL to blob
        const response = await fetch(photo);
        const blob = await response.blob();
        
        const fileName = `${tripId}/photo-${i + 1}-${Date.now()}.jpg`;
        const filePath = `${userId}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('trip-photos')
          .upload(filePath, blob);
          
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-photos')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.error('Error uploading photo:', err);
        // Continue with other photos even if one fails
      }
    }
    
    return uploadedUrls;
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

      // Create trip record
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          title: tripData.title,
          description: tripData.description,
          country_code: tripData.country_code,
          cost: tripData.cost,
          companions: tripData.companions,
          tagged_friends: tripData.taggedFriends || [], // Store tagged friend usernames
          duration: tripData.duration,
          distance: tripData.distance || '', // Make sure this doesn't cause issues if undefined
          stops: tripData.route,
          photo_count: tripData.photos.length,
          photo_details: tripData.photo_details ? JSON.stringify(tripData.photo_details) : '[]', // Store detailed photo information as JSON
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

      // Upload photos if any
      let imageUrls: string[] = [];
      if (tripData.photos.length > 0) {
        console.log('Uploading photos:', tripData.photos.length);
        imageUrls = await uploadTripPhotos(tripData.photos, trip.id, user.id);
        console.log('Photos uploaded:', imageUrls);
        
        // Update trip with image URLs
        const { error: updateError } = await supabase
          .from('trips')
          .update({ images: imageUrls })
          .eq('id', trip.id);
          
        if (updateError) {
          console.error('Error updating trip with images:', updateError);
          throw updateError;
        }
      }

      // Create trip tags for tagged friends
      if (tripData.taggedFriends && tripData.taggedFriends.length > 0) {
        console.log('Creating trip tags for:', tripData.taggedFriends);
        
        // Get user IDs for tagged usernames
        const { data: taggedUsers, error: usersError } = await supabase
          .from('profiles')
          .select('user_id')
          .in('username', tripData.taggedFriends);
        
        if (usersError) {
          console.error('Error fetching tagged users:', usersError);
        } else if (taggedUsers && taggedUsers.length > 0) {
          // Create trip_tags records
          const tripTags = taggedUsers.map(taggedUser => ({
            trip_id: trip.id,
            user_id: user.id, // Trip creator
            tagged_user_id: taggedUser.user_id
          }));
          
          const { error: tagsError } = await supabase
            .from('trip_tags')
            .insert(tripTags);
          
          if (tagsError) {
            console.error('Error creating trip tags:', tagsError);
          } else {
            console.log('Trip tags created successfully');
          }
        }
      }

      // Always create a post for the trip
      console.log('Creating post for trip');
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          trip_id: trip.id,
          content: tripData.description,
          image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null, // Save all images as JSON
          is_private: !tripData.is_public // Private post if trip is not public
        });

      if (postError) {
        console.error('Error creating post:', postError);
        // Don't throw here as trip creation succeeded
      } else {
        console.log('Post created successfully');
      }

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