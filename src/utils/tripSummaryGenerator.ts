export interface TripSummaryData {
  destination: string;
  startDate?: Date;
  endDate?: Date;
  holidayTypes?: string[];
}

export const generateTripSummary = (data: TripSummaryData): string => {
  const { destination, startDate, endDate, holidayTypes } = data;
  
  // Generate holiday type string
  const holidayType = holidayTypes && holidayTypes.length > 0 
    ? holidayTypes[0].toLowerCase().replace('holiday', '').trim()
    : 'trip';
  
  // Process destination based on rules
  const processDestination = (dest: string): string => {
    const countries = extractCountries(dest);
    const continents = extractContinents(dest);
    
    if (countries.length === 2) {
      return countries.join(' & ');
    } else if (countries.length > 2) {
      if (continents.length > 2) {
        // Multiple continents - use city if single, otherwise country
        const cities = extractCities(dest);
        return cities.length === 1 ? cities[0] : countries[0];
      } else {
        // Same continent - use continent name
        return continents[0] || dest;
      }
    }
    
    // Single destination or city
    return dest.split(',')[0].trim();
  };
  
  // Generate duration
  const duration = startDate && endDate 
    ? getDuration(startDate, endDate)
    : '';
  
  const processedDestination = processDestination(destination);
  
  // Construct summary (10-20 words)
  const parts = [
    holidayType,
    'to',
    processedDestination,
    duration
  ].filter(Boolean);
  
  return parts.join(' ');
};

const extractCountries = (destination: string): string[] => {
  // Simple country extraction - can be enhanced with a proper country list
  const commonCountries = [
    'USA', 'United States', 'France', 'Italy', 'Spain', 'Germany', 'UK', 'United Kingdom',
    'Japan', 'China', 'India', 'Brazil', 'Australia', 'Canada', 'Mexico', 'Thailand',
    'Greece', 'Turkey', 'Egypt', 'Morocco', 'Portugal', 'Netherlands', 'Belgium',
    'Switzerland', 'Austria', 'Norway', 'Sweden', 'Denmark', 'Finland', 'Poland'
  ];
  
  return commonCountries.filter(country => 
    destination.toLowerCase().includes(country.toLowerCase())
  );
};

const extractContinents = (destination: string): string[] => {
  const continentKeywords = {
    'Europe': ['france', 'italy', 'spain', 'germany', 'uk', 'greece', 'portugal', 'netherlands', 'belgium', 'switzerland', 'austria', 'norway', 'sweden', 'denmark', 'finland', 'poland'],
    'Asia': ['japan', 'china', 'india', 'thailand', 'singapore', 'malaysia', 'korea', 'vietnam', 'cambodia', 'laos', 'myanmar'],
    'North America': ['usa', 'united states', 'canada', 'mexico'],
    'South America': ['brazil', 'argentina', 'chile', 'peru', 'colombia', 'ecuador'],
    'Africa': ['egypt', 'morocco', 'south africa', 'kenya', 'tanzania'],
    'Oceania': ['australia', 'new zealand', 'fiji']
  };
  
  const dest = destination.toLowerCase();
  return Object.entries(continentKeywords)
    .filter(([continent, keywords]) => 
      keywords.some(keyword => dest.includes(keyword))
    )
    .map(([continent]) => continent);
};

const extractCities = (destination: string): string[] => {
  // Extract what looks like city names (capitalized words before commas)
  const parts = destination.split(',').map(p => p.trim());
  return parts.filter(part => 
    /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(part)
  );
};

const getDuration = (startDate: Date, endDate: Date): string => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'for 1 day';
  if (diffDays <= 7) return `for ${diffDays} days`;
  
  const weeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;
  
  if (weeks === 1 && remainingDays === 0) return 'for 1 week';
  if (weeks >= 1 && remainingDays === 0) return `for ${weeks} weeks`;
  if (weeks === 1) return `for 1 week ${remainingDays} days`;
  
  return `for ${weeks} weeks ${remainingDays} days`;
};