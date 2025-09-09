// Location data service with GPT generation and local caching
import { supabase } from '@/integrations/supabase/client';

interface LocationInfo {
  name: string;
  country: string;
  description: string;
  thingsToDo: string[];
  priceRange: string;
  bestSeason: string;
  cached: boolean;
}

class LocationDataService {
  private static cache = new Map<string, LocationInfo>();

  static async getLocationInfo(locationName: string): Promise<LocationInfo> {
    const normalizedName = locationName.toLowerCase().trim();
    
    // Check in-memory cache first
    if (this.cache.has(normalizedName)) {
      console.log('Loading from cache:', normalizedName);
      return this.cache.get(normalizedName)!;
    }

    // Check localStorage cache
    const cachedData = localStorage.getItem(`location_${normalizedName}`);
    if (cachedData) {
      try {
        const locationInfo = JSON.parse(cachedData);
        this.cache.set(normalizedName, locationInfo);
        console.log('Loading from localStorage:', normalizedName);
        return locationInfo;
      } catch (error) {
        console.error('Error parsing cached location data:', error);
      }
    }

    // Generate new location info with GPT
    console.log('Generating new location info for:', locationName);
    return await this.generateLocationInfo(locationName);
  }

  private static async generateLocationInfo(locationName: string): Promise<LocationInfo> {
    try {
      // Call edge function to generate location information
      const { data, error } = await supabase.functions.invoke('generate-location-info', {
        body: { locationName }
      });

      if (error) {
        console.error('Error generating location info:', error);
        return this.getFallbackLocationInfo(locationName);
      }

      const locationInfo: LocationInfo = {
        name: data.name || locationName,
        country: data.country || 'Unknown',
        description: data.description || `Discover the wonders of ${locationName}, a beautiful destination offering unique experiences.`,
        thingsToDo: data.thingsToDo || ['Explore local attractions', 'Experience local culture', 'Try regional cuisine'],
        priceRange: data.priceRange || '$50-150 per day',
        bestSeason: data.bestSeason || 'Year-round',
        cached: false
      };

      // Cache in localStorage
      this.cacheLocationInfo(locationName, locationInfo);
      
      // Store in memory cache
      this.cache.set(locationName.toLowerCase().trim(), locationInfo);
      
      return locationInfo;
    } catch (error) {
      console.error('Error in generateLocationInfo:', error);
      return this.getFallbackLocationInfo(locationName);
    }
  }

  private static cacheLocationInfo(locationName: string, info: LocationInfo): void {
    try {
      localStorage.setItem(`location_${locationName.toLowerCase().trim()}`, JSON.stringify(info));
    } catch (error) {
      console.error('Error caching location info:', error);
    }
  }

  private static getFallbackLocationInfo(locationName: string): LocationInfo {
    return {
      name: locationName,
      country: 'Unknown',
      description: `Discover the wonders of ${locationName}, a beautiful destination offering unique experiences and cultural attractions.`,
      thingsToDo: ['Explore historical landmarks', 'Experience local cuisine', 'Visit museums and galleries'],
      priceRange: '$50-150 per day',
      bestSeason: 'Varies by season',
      cached: false
    };
  }
}

export { LocationDataService, type LocationInfo };