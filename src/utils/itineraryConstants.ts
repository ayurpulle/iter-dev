// Holiday type and budget coding system
export const HOLIDAY_TYPE_CODES = {
  // Adventure types
  'Adventure': 'ADV',
  'Hiking': 'HIK',
  'Water Sports': 'WAT',
  'Extreme Sports': 'EXT',
  
  // Cultural types
  'Cultural': 'CUL',
  'Museums': 'MUS',
  'Historical Sites': 'HIS',
  'Art': 'ART',
  'Local Experiences': 'LOC',
  
  // Relaxation types
  'Relaxation': 'REL',
  'Beach': 'BCH',
  'Spa': 'SPA',
  'Wellness': 'WEL',
  
  // Food & Drink
  'Food': 'FOO',
  'Fine Dining': 'FIN',
  'Street Food': 'STR',
  'Wine Tasting': 'WIN',
  'Cooking Classes': 'COO',
  
  // Nature types
  'Nature': 'NAT',
  'Wildlife': 'WIL',
  'Photography': 'PHO',
  'Scenic Drives': 'SCE',
  
  // Nightlife & Entertainment
  'Nightlife': 'NIG',
  'Live Music': 'MUS',
  'Theater': 'THE',
  'Festivals': 'FES',
  
  // Shopping & Business
  'Shopping': 'SHO',
  'Business': 'BUS',
  'Markets': 'MAR',
  
  // Family & Romance
  'Family': 'FAM',
  'Romance': 'ROM',
  'Honeymoon': 'HON'
} as const;

export const BUDGET_CODES = {
  1: 'B1', // Budget
  2: 'B2', // Economy 
  3: 'B3', // Standard
  4: 'B4', // Premium
  5: 'B5'  // Luxury
} as const;

// Reverse mappings for decoding
export const CODE_TO_HOLIDAY_TYPE = Object.fromEntries(
  Object.entries(HOLIDAY_TYPE_CODES).map(([key, value]) => [value, key])
);

export const CODE_TO_BUDGET = Object.fromEntries(
  Object.entries(BUDGET_CODES).map(([key, value]) => [value, parseInt(key)])
);

// Helper functions
export const encodeHolidayTypes = (types: string[]): string[] => {
  return types.map(type => HOLIDAY_TYPE_CODES[type as keyof typeof HOLIDAY_TYPE_CODES] || type);
};

export const decodeHolidayTypes = (codes: string[]): string[] => {
  return codes.map(code => CODE_TO_HOLIDAY_TYPE[code] || code);
};

export const encodeBudget = (budget: number): string => {
  return BUDGET_CODES[budget as keyof typeof BUDGET_CODES] || 'B3';
};

export const decodeBudget = (code: string): number => {
  return CODE_TO_BUDGET[code] || 3;
};