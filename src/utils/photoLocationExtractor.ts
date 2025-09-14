import exifr from 'exifr';

interface LocationData {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

interface ExifData {
  latitude?: number;
  longitude?: number;
  GPS?: {
    GPSLatitude?: number;
    GPSLongitude?: number;
  };
}

// Reverse geocoding function to get location name from coordinates
const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    // Using a simple reverse geocoding API (you can use your preferred service)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await response.json();
    
    if (data.city && data.countryName) {
      return `${data.city}, ${data.countryName}`;
    } else if (data.locality && data.countryName) {
      return `${data.locality}, ${data.countryName}`;
    } else if (data.countryName) {
      return data.countryName;
    }
    
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
};

export const extractLocationFromPhoto = async (file: File): Promise<LocationData> => {
  try {
    console.log('Extracting EXIF data from photo:', file.name);
    
    // Extract EXIF data from the photo
    const exifData: ExifData = await exifr.parse(file, {
      gps: true,
      pick: ['GPS', 'latitude', 'longitude']
    });
    
    console.log('EXIF data extracted:', exifData);
    
    let latitude: number | undefined;
    let longitude: number | undefined;
    
    // Check for GPS coordinates in different EXIF formats
    if (exifData?.latitude && exifData?.longitude) {
      latitude = exifData.latitude;
      longitude = exifData.longitude;
    } else if (exifData?.GPS?.GPSLatitude && exifData?.GPS?.GPSLongitude) {
      latitude = exifData.GPS.GPSLatitude;
      longitude = exifData.GPS.GPSLongitude;
    }
    
    if (latitude && longitude) {
      console.log(`Found GPS coordinates: ${latitude}, ${longitude}`);
      
      // Get location name from coordinates
      const locationName = await reverseGeocode(latitude, longitude);
      console.log('Location name:', locationName);
      
      return {
        latitude,
        longitude,
        locationName: locationName || undefined
      };
    }
    
    console.log('No GPS coordinates found in EXIF data');
    return {};
  } catch (error) {
    console.error('Error extracting location from photo:', error);
    return {};
  }
};

export const extractLocationFromBase64 = async (base64Image: string): Promise<LocationData> => {
  try {
    // Convert base64 to blob
    const response = await fetch(base64Image);
    const blob = await response.blob();
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    
    return await extractLocationFromPhoto(file);
  } catch (error) {
    console.error('Error extracting location from base64:', error);
    return {};
  }
};