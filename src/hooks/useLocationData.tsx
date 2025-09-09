import { useState, useEffect } from 'react';

interface LocationInfo {
  name: string;
  country: string;
  description: string;
  thingsToDo: string[];
  priceRange: string;
  bestSeason: string;
}

const locationDatabase: Record<string, LocationInfo> = {
  'tokyo': {
    name: 'Tokyo',
    country: 'Japan',
    description: 'A vibrant metropolis blending ultra-modern technology with traditional culture, offering world-class cuisine and endless exploration.',
    thingsToDo: ['Visit Senso-ji Temple', 'Explore Shibuya Crossing', 'Experience Tokyo Skytree'],
    priceRange: '$80-250 per day',
    bestSeason: 'Spring & Fall'
  },
  'paris': {
    name: 'Paris',
    country: 'France',
    description: 'The City of Light captivates with its romantic atmosphere, world-renowned museums, and exquisite culinary scene.',
    thingsToDo: ['Visit the Eiffel Tower', 'Explore the Louvre Museum', 'Stroll along the Seine'],
    priceRange: '$70-200 per day',
    bestSeason: 'Spring & Summer'
  },
  'new york': {
    name: 'New York',
    country: 'United States',
    description: 'The city that never sleeps offers iconic landmarks, Broadway shows, and diverse neighborhoods each with unique character.',
    thingsToDo: ['Visit Central Park', 'See a Broadway show', 'Explore Times Square'],
    priceRange: '$100-300 per day',
    bestSeason: 'Spring & Fall'
  },
  'london': {
    name: 'London',
    country: 'United Kingdom',
    description: 'A historic capital mixing royal heritage with modern innovation, featuring world-class museums and vibrant markets.',
    thingsToDo: ['Visit Big Ben', 'Explore British Museum', 'Walk through Hyde Park'],
    priceRange: '$80-220 per day',
    bestSeason: 'Summer'
  },
  'rome': {
    name: 'Rome',
    country: 'Italy',
    description: 'The Eternal City where ancient history meets modern life, offering incredible architecture and authentic Italian cuisine.',
    thingsToDo: ['Visit the Colosseum', 'Explore Vatican City', 'Throw coin in Trevi Fountain'],
    priceRange: '$60-180 per day',
    bestSeason: 'Spring & Fall'
  },
  'barcelona': {
    name: 'Barcelona',
    country: 'Spain',
    description: 'A Mediterranean gem known for Gaudí\'s architecture, vibrant street life, and beautiful beaches.',
    thingsToDo: ['Visit Sagrada Familia', 'Explore Park Güell', 'Relax at Barceloneta Beach'],
    priceRange: '$50-150 per day',
    bestSeason: 'Spring & Summer'
  },
  'istanbul': {
    name: 'Istanbul',
    country: 'Turkey',
    description: 'A bridge between Europe and Asia, offering rich Byzantine history, stunning mosques, and vibrant bazaars.',
    thingsToDo: ['Visit Hagia Sophia', 'Explore Grand Bazaar', 'Take Bosphorus cruise'],
    priceRange: '$40-120 per day',
    bestSeason: 'Spring & Fall'
  },
  'sydney': {
    name: 'Sydney',
    country: 'Australia',
    description: 'Australia\'s harbor city featuring iconic architecture, beautiful beaches, and a laid-back outdoor lifestyle.',
    thingsToDo: ['Visit Opera House', 'Climb Harbour Bridge', 'Relax at Bondi Beach'],
    priceRange: '$90-250 per day',
    bestSeason: 'Spring & Summer'
  },
  'dubai': {
    name: 'Dubai',
    country: 'UAE',
    description: 'A futuristic city in the desert, known for luxury shopping, ultramodern architecture, and vibrant nightlife.',
    thingsToDo: ['Visit Burj Khalifa', 'Explore Dubai Mall', 'Experience desert safari'],
    priceRange: '$80-300 per day',
    bestSeason: 'Winter'
  },
  'singapore': {
    name: 'Singapore',
    country: 'Singapore',
    description: 'A modern city-state blending cultures, featuring incredible food, futuristic gardens, and efficient urban planning.',
    thingsToDo: ['Visit Gardens by the Bay', 'Explore Marina Bay Sands', 'Try street food'],
    priceRange: '$70-200 per day',
    bestSeason: 'Year-round'
  },
  'карсовай': {
    name: 'Карсовай',
    country: 'Russia',
    description: 'Discover the wonders of Карсовай, a beautiful destination offering unique experiences and cultural attractions.',
    thingsToDo: ['Explore historical landmarks', 'Experience local cuisine', 'Visit museums and galleries'],
    priceRange: '$30-200 per day',
    bestSeason: 'Varies by season'
  }
};

export const useLocationData = () => {
  const getLocationInfo = (locationName: string): LocationInfo => {
    const normalizedName = locationName.toLowerCase().trim();
    
    // Try exact match first
    if (locationDatabase[normalizedName]) {
      return locationDatabase[normalizedName];
    }
    
    // Try partial match
    const partialMatch = Object.keys(locationDatabase).find(key => 
      key.includes(normalizedName) || normalizedName.includes(key)
    );
    
    if (partialMatch) {
      return locationDatabase[partialMatch];
    }
    
    // Return default info for unknown locations
    return {
      name: locationName,
      country: 'Unknown',
      description: `Discover the wonders of ${locationName}, a beautiful destination offering unique experiences and cultural attractions.`,
      thingsToDo: ['Explore historical landmarks', 'Experience local cuisine', 'Visit museums and galleries'],
      priceRange: '$50-150 per day',
      bestSeason: 'Varies by season'
    };
  };

  return { getLocationInfo };
};