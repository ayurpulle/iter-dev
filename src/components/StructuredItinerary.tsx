import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plane, Hotel, MapPin, Clock, DollarSign, ExternalLink, Info, Calendar, Edit3, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InteractiveItineraryMap } from './InteractiveItineraryMap';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
// Removed import of generateTripSummary as we now use dynamic summary generation
import { SavedRecommendationModal } from './SavedRecommendationModal';
import { ItineraryUpdateDropdown } from './ItineraryUpdateDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encodeHolidayTypes, encodeBudget, decodeHolidayTypes, decodeBudget } from '@/utils/itineraryConstants';

interface FriendRecommendation {
  name: string;
  avatar?: string;
  review: string;
  rating: number;
  visitDate: string;
}

interface StructuredItineraryProps {
  itinerary: string;
  friendRecommendations?: { [venueName: string]: FriendRecommendation[] };
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  holidayTypes?: string[] | string;
  budget?: string;
  onUpdateDates?: (startDate: Date, endDate: Date) => void;
  onUpdateItinerary?: (changes: { startDate?: Date; endDate?: Date; holidayTypes?: string[]; budget?: number; destination?: string }) => void;
  iterData?: {
    id: string;
    title: string;
    destination: string;
    itinerary_content: string;
    is_owner?: boolean;
    can_edit?: boolean;
    start_date?: string | null;
    end_date?: string | null;
    budget?: number | null;
    interests?: string[] | null;
  };
  onIterUpdated?: (newContent: string, newDestination?: string) => void;
}

export const StructuredItinerary = ({ 
  itinerary, 
  friendRecommendations = {}, 
  destination,
  startDate,
  endDate,
  holidayTypes,
  budget,
  onUpdateDates,
  onUpdateItinerary,
  iterData,
  onIterUpdated
}: StructuredItineraryProps) => {
  console.log('StructuredItinerary component props received:', { 
    hasItinerary: !!itinerary, 
    hasIterData: !!iterData,
    destination 
  });
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  // Decode values from iterData or use props as fallback
  const decodedBudget = useMemo(() => {
    console.log('Budget decoding - iterData.budget:', iterData?.budget, 'typeof:', typeof iterData?.budget);
    if (iterData?.budget !== undefined && iterData?.budget !== null) {
      // Use the budget field which contains the integer value from the encoded data
      const budgetValue = iterData.budget;
      console.log('Using iterData.budget:', budgetValue);
      return budgetValue;
    }
    if (typeof budget === 'string' && budget.length > 0) {
      const parsed = parseInt(budget);
      return isNaN(parsed) ? 3 : Math.max(1, Math.min(5, parsed));
    }
    if (typeof budget === 'number') return Math.max(1, Math.min(5, budget));
    console.log('Using default budget: 3');
    return 3;
  }, [budget, iterData?.budget]);
  
  const decodedHolidayTypes = useMemo(() => {
    if (iterData?.interests) {
      const decoded = decodeHolidayTypes(iterData.interests);
      console.log('Decoding holiday types:', iterData.interests, '→', decoded);
      return decoded;
    }
    return Array.isArray(holidayTypes) ? holidayTypes : [];
  }, [iterData?.interests, holidayTypes]);

  // Normalize holiday types consistently  
  const normalizedHolidayTypes = useMemo(() => {
    if (Array.isArray(holidayTypes)) return holidayTypes;
    if (typeof holidayTypes === 'string' && holidayTypes.length > 0) return holidayTypes.split(',').map(t => t.trim()).filter(Boolean);
    if (iterData?.interests && Array.isArray(iterData.interests)) return iterData.interests;
    return [];
  }, [holidayTypes, iterData?.interests]);

  // Validate required data before rendering
  const safeDestination = destination || iterData?.destination || 'Unknown Destination';
  const hasValidIterData = iterData && iterData.id;

  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);
  
  // Date validation: ensure start date is not after end date
  const validateDates = (start: Date | undefined, end: Date | undefined) => {
    if (start && end && start > end) {
      return false;
    }
    return true;
  };
  
  const [localHolidayTypes, setLocalHolidayTypes] = useState<string[]>(decodedHolidayTypes);
  const [localBudget, setLocalBudget] = useState<number>(decodedBudget);
  
  // Log when decoded values are loaded as pre-selected
  useEffect(() => {
    console.log('Pre-selecting decoded values:', {
      decodedBudget,
      decodedHolidayTypes,
      localBudget,
      localHolidayTypes
    });
  }, [decodedBudget, decodedHolidayTypes, localBudget, localHolidayTypes]);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  // Always call useToast at top level (React hook rules)
  const { toast } = useToast();

  // Utility function to safely use toast
  const safeToast = useCallback((message: Parameters<typeof toast>[0]) => {
    try {
      if (typeof toast === 'function') {
        toast(message);
      } else {
        console.warn('Toast function not available:', message);
      }
    } catch (error) {
      console.error('Toast error:', error, message);
    }
  }, [toast]);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  // Store original destination

  const availableHolidayTypes = [
    "Adventure & Outdoor",
    "Beach & Relaxation", 
    "City Break",
    "Cultural & Historical",
    "Food & Wine",
    "Romantic Getaway",
    "Family Holiday",
    "Solo Travel",
    "Backpacking",
    "Luxury & Spa"
  ];

  const toggleHolidayType = (type: string) => {
    setLocalHolidayTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getBudgetDisplay = (budget: number) => {
    if (budget === 0) return "Select budget";
    return "$".repeat(budget);
  };

  const getBudgetDescription = (budget: number) => {
    const descriptions = {
      1: "Budget-friendly",
      2: "Moderate", 
      3: "Comfortable",
      4: "Luxury",
      5: "Ultra-luxury"
    };
    return descriptions[budget as keyof typeof descriptions] || "";
  };

  // Extract or generate dynamic trip summary from itinerary
  const getItinerarySummary = () => {
    // First try to extract from the actual itinerary content
    if (parsed.summary && parsed.summary.trim()) {
      return parsed.summary.trim();
    }
    
    // Fallback to dynamic generation if no summary in content
    const dest = destination || parsed.destinations[0] || 'your destination';
    const days = localStartDate && localEndDate 
      ? Math.ceil((localEndDate.getTime() - localStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const primaryType = localHolidayTypes.length > 0 ? localHolidayTypes[0] : 'Cultural & Historical';
    const budgetStr = getBudgetDescription(localBudget).toLowerCase();
    
    if (days) {
      const duration = days <= 7 ? `${days}-day` : days <= 14 ? `${days}-day` : `${Math.ceil(days/7)}-week`;
      return `Embark on a ${duration} ${primaryType.toLowerCase()} adventure in ${dest}. This ${budgetStr} itinerary combines authentic experiences with carefully curated recommendations to create unforgettable memories.`;
    } else {
      return `Discover the essence of ${dest} through this ${primaryType.toLowerCase()} journey. Experience the destination's unique character with ${budgetStr} recommendations tailored to your interests.`;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderFriendRecommendations = (venueName: string) => {
    const recommendations = friendRecommendations[venueName];
    if (!recommendations || recommendations.length === 0) return null;

    return (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Friend Recommendations:
        </h4>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={rec.avatar} />
                <AvatarFallback className="text-xs">{rec.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    {rec.name}
                  </span>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${
                          i < rec.rating ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                  "{rec.review}"
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Visited {rec.visitDate}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const parseItinerary = () => {
    console.log('Parsing itinerary content:', itinerary?.substring(0, 200));
    
    if (!itinerary || typeof itinerary !== 'string') {
      console.error('Invalid itinerary content:', itinerary);
      return {
        summary: '',
        gettingThere: '',
        perfectStay: '',
        days: [],
        travelTips: '',
        bookingLinks: '',
        destinations: [destination || 'Destination']
      };
    }
    
    // Split into main sections based on headers
    const sections = itinerary.split(/(?=\*\*Trip Summary\*\*|\*\*Getting There\*\*|\*\*Perfect Stay\*\*|\*\*Day-by-Day Itinerary\*\*|\*\*Travel Tips\*\*|\*\*Booking Links\*\*)/);
    console.log('Parsed sections:', sections.length);
    
    const parsed = {
      summary: '',
      gettingThere: '',
      perfectStay: '',
      days: [] as any[],
      travelTips: '',
      bookingLinks: '',
      destinations: [] as string[]
    };

    // Use the provided destination or extract from content as fallback
    const getDestinations = () => {
      if (destination) {
        return [destination];
      }
      
      // Fallback to basic extraction if no destination provided
      const content = itinerary;
      const cityCountryPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
      const matches = Array.from(content.matchAll(cityCountryPattern));
      
      if (matches.length > 0) {
        return [matches[0][0]]; // Return first city, country match
      }
      
      // Very basic fallback - look for common destination patterns
      const basicPattern = /(?:Tokyo|Paris|London|New York|San Francisco|Rome|Barcelona|Amsterdam|Berlin|Sydney|Melbourne|Bangkok|Singapore|Dubai|Istanbul|Morocco|Japan|Italy|France|Spain|Germany|Australia|Thailand|UAE)/gi;
      const basicMatches = content.match(basicPattern);
      
      return basicMatches ? [basicMatches[0]] : ['Destination'];
    };

    sections.forEach(section => {
      const trimmed = section.trim();
      if (trimmed.startsWith('**Trip Summary**')) {
        parsed.summary = trimmed.replace('**Trip Summary**', '').trim();
      } else if (trimmed.startsWith('**Getting There**')) {
        parsed.gettingThere = trimmed.replace('**Getting There**', '').trim();
      } else if (trimmed.startsWith('**Perfect Stay**')) {
        parsed.perfectStay = trimmed.replace('**Perfect Stay**', '').trim();
      } else if (trimmed.startsWith('**Day-by-Day Itinerary**') || trimmed.includes('**Day') || trimmed.includes('Day ') || trimmed.includes('Days ')) {
        // Enhanced day parsing to catch both single days and grouped days
        const content = trimmed;
        
        // Match both "Day X:" and "Days X-Y:" patterns
        const dayMatches = content.match(/(?:\*\*)?Days? \d+(?:-\d+)?:?[^\n]*(?:\*\*)?/gi);
        console.log('Day matches found:', dayMatches);
        
        if (dayMatches) {
          dayMatches.forEach((dayMatch, matchIndex) => {
            // Find content between this day and the next day (or end of section)
            const dayPattern = dayMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(dayPattern + '([\\s\\S]*?)(?=(?:\\*\\*)?Days? \\d+:|$)', 'i');
            const match = content.match(regex);
            const dayContent = match?.[1] || '';
            
            // Parse day patterns
            const singleDayMatch = dayMatch.match(/Day (\d+)/i);
            const dayRangeMatch = dayMatch.match(/Days (\d+)-(\d+)/i);
            
            let dayNum, dayTitle;
            
            if (dayRangeMatch) {
              // For day ranges like "Days 1-2"
              dayNum = dayRangeMatch[1];
              dayTitle = dayMatch.replace(/\*\*Days? \d+-\d+:?\s*/i, '').replace(/\*\*/g, '').trim();
              if (!dayTitle) {
                dayTitle = `Days ${dayRangeMatch[1]}-${dayRangeMatch[2]}`;
              }
            } else if (singleDayMatch) {
              // For single days like "Day 1"
              dayNum = singleDayMatch[1];
              dayTitle = dayMatch.replace(/\*\*Day \d+:?\s*/i, '').replace(/\*\*/g, '').trim();
              if (!dayTitle) {
                dayTitle = `Day ${dayNum}`;
              }
            }
            
            console.log(`Parsing Day ${dayNum}:`, { dayTitle, contentLength: dayContent.length });
            
            if (dayNum) {
              parsed.days.push({
                number: dayNum,
                title: dayTitle,
                content: dayContent.trim()
              });
            }
          });
        }
      } else if (trimmed.startsWith('**Travel Tips**')) {
        parsed.travelTips = trimmed.replace('**Travel Tips**', '').trim();
      } else if (trimmed.startsWith('**Booking Links**')) {
        parsed.bookingLinks = trimmed.replace('**Booking Links**', '').trim();
      }
    });

    // Set destinations after parsing
    parsed.destinations = getDestinations();
    
    return parsed;
  };

  const renderContentWithLinks = (content: string) => {
    // Enhanced time-based section formatting - remove asterisks and use proper formatting
    const formatTimeBasedContent = (text: string) => {
      // Clean up single asterisks around random words first
      let formatted = text
        .replace(/\*([^*\s]+)\*/g, '**$1**') // Convert single asterisks to double for consistency
        .replace(/\*{3,}/g, '**'); // Clean up multiple asterisks
      
      // Remove asterisks around time labels and replace with bold formatting
      const timePattern = /\*{1,2}([^*]+(?:Morning|Afternoon|Evening|Lunch|Dinner|Breakfast|Night|Late Morning|Early Evening|Midday|Noon)[^*]*)\*{1,2}/gmi;
      
      // Handle asterisk-wrapped time labels
      formatted = formatted.replace(timePattern, '**$1**');
      
      // Then handle standalone time labels
      const standaloneTimePattern = /(?:^|\n)((?:Morning|Afternoon|Evening|Lunch|Dinner|Breakfast|Night|Late Morning|Early Evening|Midday|Noon)[:\-\s]*)/gmi;
      
      formatted = formatted.replace(standaloneTimePattern, (match, timeLabel) => {
        const cleanLabel = timeLabel.replace(/[::\-\s]*$/, '').trim();
        return `\n**TIME_SECTION:${cleanLabel.toUpperCase()}**\n`;
      });

      return formatted;
    };

    // Format travel-related content with better headers
    const formatTravelContent = (text: string) => {
      return text
        .replace(/(?:^|\n)(Getting [Tt]here|Getting to|Travel to|Outbound|Departure)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:GETTING_THERE**\n')
        .replace(/(?:^|\n)(Coming [Hh]ome|Return|Coming back|Homeward|Return Journey)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:COMING_HOME**\n')
        .replace(/(?:^|\n)(Perfect [Ss]tay|Where to [Ss]tay|Accommodation|Hotels?|Stay)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:PERFECT_STAY**\n')
        .replace(/(?:^|\n)(Travel [Tt]ips|Tips|Recommendations|Getting Around)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:TRAVEL_RECOMMENDATIONS**\n');
    };

    // Clean up links and AI-generated explanatory text
    const cleanContent = (text: string) => {
      return text
        // Remove raw URLs that aren't in proper link format
        .replace(/https?:\/\/[^\s\)]+/g, '')
        // Remove "here's the booking link" type phrases
        .replace(/(?:here'?s?\s+(?:the\s+)?(?:booking\s+)?link|here\s+is\s+(?:the\s+)?(?:booking\s+)?link)[:\-\s]*/gmi, '')
        // Remove "you can book" type phrases
        .replace(/(?:you\s+can\s+book)[:\-\s]*/gmi, '')
        // Remove standalone explanatory phrases
        .replace(/(?:^|\n)(?:for\s+booking|to\s+book|booking\s+available)[:\-\s]*(?:\n|$)/gmi, '\n')
        // Clean up multiple newlines
        .replace(/\n{3,}/g, '\n\n');
    };

    // Enhanced link detection for various travel sites and hotel names
    const urlRegex = /(https?:\/\/(?:www\.)?(?:booking\.com|skyscanner\.com|getyourguide\.com|airbnb\.com|expedia\.com|hotels\.com|tripadvisor\.com|marriott\.com|hilton\.com|hyatt\.com|ihg\.com|accor\.com)[^\s]*)/g;
    
    // Hotel name patterns that should become booking links
    const hotelPatterns = /\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\s+(?:Hotel|Resort|Inn|Lodge|Suites?|Marriott|Hilton|Hyatt|Sheraton|Westin|Ritz-Carlton|Four Seasons|St\. Regis|Edition|Luxury Collection))\b/g;
    
    const processedContent = cleanContent(formatTravelContent(formatTimeBasedContent(content)));
    
    // First split by URLs, then handle hotel names in non-URL parts
    const urlParts = processedContent.split(urlRegex);
    const finalParts: (string | JSX.Element)[] = [];
    
    urlParts.forEach((part, index) => {
      if (urlRegex.test(part)) {
        finalParts.push(part); // Keep URL as-is for processing later
      } else {
        // Process hotel names in this text part
        const hotelParts = part.split(hotelPatterns);
        hotelParts.forEach((hotelPart, hotelIndex) => {
          if (hotelIndex % 2 === 1) {
            // This is a hotel name - create a booking link
            const searchQuery = encodeURIComponent(hotelPart + ' ' + (destination || 'hotel'));
            finalParts.push(
              <a
                key={`hotel-${index}-${hotelIndex}`}
                href={`https://www.booking.com/search.html?ss=${searchQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 mx-1 text-xs font-medium rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors underline decoration-purple-500 decoration-1 underline-offset-2"
              >
                {hotelPart}
                <ExternalLink className="h-3 w-3" />
              </a>
            );
          } else {
            finalParts.push(hotelPart);
          }
        });
      }
    });
    
    return finalParts.map((part, index) => {
      if (typeof part === 'object') {
        return part; // Already a JSX element
      }
      
      if (urlRegex.test(part)) {
        const linkText = part.includes('booking.com') ? 'Book Hotel' : 
                        part.includes('skyscanner') ? 'Find Flights' :
                        part.includes('getyourguide') ? 'Book Activity' :
                        part.includes('airbnb') ? 'Book Stay' :
                        part.includes('expedia') ? 'Book Travel' :
                        part.includes('hotels.com') ? 'Book Hotel' :
                        part.includes('tripadvisor') ? 'See Reviews' : 'View Link';
        
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 mx-1 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors underline decoration-blue-500 decoration-1 underline-offset-2"
          >
            {linkText}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      // Handle both saved recommendations and friend recommendations
      const savedRecRegex = /\[SAVED_REC:([^:\]]+):([^:\]]+)\]/g;
      const friendRecRegex = /\[FRIEND_REC:([^\]]+)\]/g;
      
      // Count saved recommendations for this venue
      const getSavedRecCount = (venueName: string) => {
        const matches = part.match(new RegExp(`\\[SAVED_REC:${venueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([^:\\]]+)\\]`, 'g'));
        return matches ? matches.length : 1;
      };
      
      // First handle saved recommendations
      let savedRecParts = part.split(savedRecRegex);
      let processedParts: (string | JSX.Element)[] = [];
      
      savedRecParts.forEach((savedPart, savedIndex) => {
        if (savedIndex % 3 === 1) {
          // This is a saved recommendation venue name
          const venueName = savedPart;
          const userName = savedRecParts[savedIndex + 1];
          const recCount = getSavedRecCount(venueName);
          
          processedParts.push(
            <span key={`saved-${index}-${savedIndex}`} className="inline-flex items-center gap-1">
              <span className="font-medium text-green-700 dark:text-green-300">{venueName}</span>
              <button 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedVenue(venueName);
                  setShowRecommendationModal(true);
                }}
                title={`Recommended by ${userName}`}
              >
                +{recCount}
              </button>
            </span>
          );
        } else if (savedIndex % 3 !== 2) {
          // Regular text content - check for friend recommendations
          const friendRecParts = savedPart.split(friendRecRegex);
          friendRecParts.forEach((friendPart, friendIndex) => {
            if (friendIndex % 2 === 1) {
              // This is a friend recommendation venue name
              const venueName = friendPart;
              processedParts.push(
                <span key={`friend-${index}-${savedIndex}-${friendIndex}`}>
                  <span className="font-medium text-blue-700 dark:text-blue-300">{venueName}</span>
                  {renderFriendRecommendations(venueName)}
                </span>
              );
            } else {
              processedParts.push(friendPart);
            }
          });
        }
      });
      
      return processedParts.map((processedPart, processedIndex) => {
        if (typeof processedPart === 'object') {
          return processedPart; // Already a JSX element
        }
        
        // Clean up asterisk formatting properly
        const cleanText = typeof processedPart === 'string' 
          ? processedPart
              .replace(/\*([^*\s][^*]*[^*\s])\*/g, '**$1**') // Convert single asterisks to double for proper bold
              .replace(/\*(\w+)\*/g, '**$1**') // Handle single words
              .replace(/\*{3,}/g, '**') // Clean up multiple asterisks
          : processedPart;

        return (
          <span key={`${index}-${processedIndex}`} className="whitespace-pre-wrap">
            {(typeof cleanText === 'string' ? cleanText : processedPart.toString()).split(/(\*\*[^*]+\*\*)/g).map((textPart, textIndex) => {
              if (textPart.startsWith('**') && textPart.endsWith('**')) {
                const headerText = textPart.slice(2, -2);
                
                // Different styling for different types of headers
                if (headerText.startsWith('TRAVEL_SECTION:')) {
                  const section = headerText.replace('TRAVEL_SECTION:', '');
                  if (section === 'GETTING_THERE') {
                    return (
                      <h3 key={textIndex} className="font-bold text-lg text-blue-700 dark:text-blue-300 mt-4 mb-2 flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-lg border-l-4 border-blue-500">
                        ✈️ Getting There
                      </h3>
                    );
                  } else if (section === 'COMING_HOME') {
                    return (
                      <h3 key={textIndex} className="font-bold text-lg text-green-700 dark:text-green-300 mt-4 mb-2 flex items-center gap-2 bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-lg border-l-4 border-green-500">
                        🏠 Coming Home
                      </h3>
                    );
                  } else if (section === 'PERFECT_STAY') {
                    return (
                      <h3 key={textIndex} className="font-bold text-lg text-purple-700 dark:text-purple-300 mt-4 mb-2 flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 px-4 py-2 rounded-lg border-l-4 border-purple-500">
                        🏨 Perfect Stay
                      </h3>
                    );
                  } else if (section === 'TRAVEL_RECOMMENDATIONS') {
                    return (
                      <h3 key={textIndex} className="font-bold text-lg text-orange-700 dark:text-orange-300 mt-4 mb-2 flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 px-4 py-2 rounded-lg border-l-4 border-orange-500">
                        💡 Travel Recommendations
                      </h3>
                    );
                  }
                } else if (headerText.startsWith('TIME_SECTION:')) {
                  const timeLabel = headerText.replace('TIME_SECTION:', '');
                  const timeEmoji = {
                    'MORNING': '🌅',
                    'LATE MORNING': '🌤️',
                    'MIDDAY': '☀️',
                    'NOON': '☀️',
                    'AFTERNOON': '🌞',
                    'EARLY EVENING': '🌆',
                    'EVENING': '🌇',
                    'NIGHT': '🌙',
                    'BREAKFAST': '🥐',
                    'LUNCH': '🍽️',
                    'DINNER': '🍷'
                  }[timeLabel] || '⏰';
                  
                  return (
                    <h4 key={textIndex} className="font-semibold text-base text-indigo-700 dark:text-indigo-300 mt-4 mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-lg border-l-3 border-indigo-400">
                      {timeEmoji} {timeLabel.charAt(0) + timeLabel.slice(1).toLowerCase()}
                    </h4>
                  );
                } else {
                  return (
                    <strong key={textIndex} className="font-semibold text-gray-900 dark:text-gray-100">
                      {headerText}
                    </strong>
                  );
                }
              } else {
                // Handle any remaining single asterisks for bold formatting
                const textWithBold = textPart.split(/(\*[^*]+\*)/g).map((subPart, subIndex) => {
                  if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
                    return <strong key={subIndex} className="font-semibold">{subPart.slice(1, -1)}</strong>;
                  }
                  return subPart;
                });
                return <span key={textIndex}>{textWithBold}</span>;
              }
            })}
          </span>
        );
      });
    });
  };

  const renderTipsWithEmojis = (tipsContent: string) => {
    // Categorize tips by content
    const categorizeTip = (tip: string): { category: string; emoji: string } => {
      const tipLower = tip.toLowerCase();
      
      // More specific categorization based on sentence-level analysis
      const sentences = tip.split(/[.!?]+/).filter(s => s.trim());
      
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        
        // Payment & Money tips
        if (sentenceLower.includes('cash') || sentenceLower.includes('card') || 
            sentenceLower.includes('payment') || sentenceLower.includes('money') ||
            sentenceLower.includes('atm') || sentenceLower.includes('currency') ||
            sentenceLower.includes('tip') && (sentenceLower.includes('restaurant') || sentenceLower.includes('service')) ||
            sentenceLower.includes('exchange') || sentenceLower.includes('fee')) {
          return { category: 'payment', emoji: '💳' };
        }
        
        // Transportation tips
        if (sentenceLower.includes('transport') || sentenceLower.includes('bus') || 
            sentenceLower.includes('train') || sentenceLower.includes('metro') ||
            sentenceLower.includes('taxi') || sentenceLower.includes('uber') ||
            sentenceLower.includes('subway') || sentenceLower.includes('station') ||
            sentenceLower.includes('ticket') && !sentenceLower.includes('museum')) {
          return { category: 'transportation', emoji: '🚇' };
        }
        
        // Language tips
        if (sentenceLower.includes('language') || sentenceLower.includes('speak') || 
            sentenceLower.includes('english') || sentenceLower.includes('translate') ||
            sentenceLower.includes('phrase') || sentenceLower.includes('hello') ||
            sentenceLower.includes('thank you') || sentenceLower.includes('please')) {
          return { category: 'language', emoji: '🗣️' };
        }
        
        // Navigation & Direction tips  
        if (sentenceLower.includes('map') || sentenceLower.includes('gps') || 
            sentenceLower.includes('direction') || sentenceLower.includes('navigate') ||
            sentenceLower.includes('address') || sentenceLower.includes('location') ||
            sentenceLower.includes('find') || sentenceLower.includes('lost')) {
          return { category: 'navigation', emoji: '🧭' };
        }
        
        // Budget tips
        if (sentenceLower.includes('budget') || sentenceLower.includes('cheap') || 
            sentenceLower.includes('expensive') || sentenceLower.includes('cost') ||
            sentenceLower.includes('price') || sentenceLower.includes('save money') ||
            sentenceLower.includes('affordable') || sentenceLower.includes('discount')) {
          return { category: 'budget', emoji: '💰' };
        }
      }
      
      // Fallback to general patterns
      if (tipLower.includes('safety') || tipLower.includes('secure') || tipLower.includes('avoid')) {
        return { category: 'safety', emoji: '🛡️' };
      }
      if (tipLower.includes('weather') || tipLower.includes('rain') || tipLower.includes('sun')) {
        return { category: 'weather', emoji: '🌤️' };
      }
      if (tipLower.includes('culture') || tipLower.includes('custom') || tipLower.includes('tradition')) {
        return { category: 'culture', emoji: '🏛️' };
      }
      if (tipLower.includes('food') || tipLower.includes('restaurant') || tipLower.includes('eat')) {
        return { category: 'food', emoji: '🍽️' };
      }
      
      return { category: 'general', emoji: '💡' };
    };

    // Split tips by line breaks and filter out empty lines
    const tips = tipsContent.split('\n').filter(tip => tip.trim() && !tip.trim().startsWith('PRACTICAL TIPS'));
    
    if (tips.length === 0) {
      return <p className="text-muted-foreground">No specific tips available.</p>;
    }

    return tips.map((tip, index) => {
      const cleanTip = tip.trim().replace(/^[-•*]\s*/, ''); // Remove bullet points
      if (!cleanTip) return null;
      
      const { category, emoji } = categorizeTip(cleanTip);
      
      return (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
          <span className="text-lg flex-shrink-0 mt-0.5">{emoji}</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{cleanTip}</p>
        </div>
      );
    }).filter(Boolean);
  };

  const parsed = parseItinerary();
  
  // Store original destination for updates
  const [originalDestination] = useState<string>(destination || parsed.destinations[0] || '');
  
  // Sync local state with props when they change
  React.useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  React.useEffect(() => {
    setLocalHolidayTypes(decodedHolidayTypes);
  }, [decodedHolidayTypes]);

  React.useEffect(() => {
    setLocalBudget(decodedBudget);
  }, [decodedBudget]);
  
  // Use dynamic trip summary instead of the old formulaic one

  // Get airport codes for destination
  const getAirportCodes = (destination: string): string[] => {
    const airportMap: { [key: string]: string[] } = {
      'new york': ['JFK', 'LGA', 'EWR'],
      'london': ['LHR', 'LGW', 'STN'],
      'paris': ['CDG', 'ORY'],
      'tokyo': ['NRT', 'HND'],
      'los angeles': ['LAX'],
      'san francisco': ['SFO'],
      'miami': ['MIA'],
      'chicago': ['ORD', 'MDW'],
      'boston': ['BOS'],
      'seattle': ['SEA'],
      'las vegas': ['LAS'],
      'rome': ['FCO', 'CIA'],
      'barcelona': ['BCN'],
      'amsterdam': ['AMS'],
      'berlin': ['BER'],
      'madrid': ['MAD'],
      'vienna': ['VIE'],
      'seoul': ['ICN', 'GMP'],
      'bangkok': ['BKK', 'DMK'],
      'singapore': ['SIN'],
      'sydney': ['SYD'],
      'dubai': ['DXB'],
      'istanbul': ['IST']
    };
    
    const dest = destination.toLowerCase();
    const matchedCity = Object.keys(airportMap).find(city => 
      dest.includes(city) || city.includes(dest.split(',')[0].trim())
    );
    
    return matchedCity ? airportMap[matchedCity] : [];
  };

  const airportCodes = getAirportCodes(destination || parsed.destinations[0] || '');

  const hasChanges = () => {
    // Compare against decoded iterData values
    const originalBudget = decodedBudget;
    const originalHolidayTypes = decodedHolidayTypes;
    const originalStartDate = iterData?.start_date ? new Date(iterData.start_date) : startDate;
    const originalEndDate = iterData?.end_date ? new Date(iterData.end_date) : endDate;
    
    return localStartDate?.getTime() !== originalStartDate?.getTime() || 
           localEndDate?.getTime() !== originalEndDate?.getTime() ||
           JSON.stringify(localHolidayTypes.sort()) !== JSON.stringify(originalHolidayTypes.sort()) ||
           localBudget !== originalBudget;
  };

  // Add data validation and better error handling
  const handleUpdate = useCallback(async () => {
    console.log('handleUpdate called, hasChanges:', hasChanges());
    console.log('Current local values:', { 
      localBudget, 
      localHolidayTypes, 
      localStartDate, 
      localEndDate 
    });
    console.log('Original decoded values:', { 
      decodedBudget, 
      decodedHolidayTypes, 
      originalStartDate: iterData?.start_date, 
      originalEndDate: iterData?.end_date 
    });
    console.log('Will encode for API:', {
      budget: localBudget,
      interests: encodeHolidayTypes(localHolidayTypes)
    });
    
      // Validate iterData exists before API calls
    if (!hasValidIterData) {
      console.error('Cannot update: Missing itinerary data or ID');
      safeToast({
        title: "Error",
        description: "Cannot update itinerary - missing data",
        variant: "destructive"
      });
      return;
    }

    if (!hasChanges()) {
      console.log('No changes detected, aborting update');
      return;
    }
    
    console.log('Update button clicked, making update request');
    
    try {
      // Serialize data to prevent DataCloneError
      const updatePayload = {
        itineraryId: iterData.id,
        destination: originalDestination,
        startDate: localStartDate?.toISOString() || null,
        endDate: localEndDate?.toISOString() || null,
        budget: localBudget || decodedBudget,
        interests: localHolidayTypes.length > 0 ? localHolidayTypes.join(', ') : decodedHolidayTypes.join(', '),
        travelStyle: localHolidayTypes.length > 0 ? localHolidayTypes.join(', ') : decodedHolidayTypes.join(', '),
        ragContext: '',
        friendRecommendations: {},
        currentContent: iterData.itinerary_content || itinerary
      };

      console.log('Making API call to update-itinerary with serialized data:', updatePayload);
      
      const { data, error } = await supabase.functions.invoke('update-itinerary', {
        body: updatePayload
      });

      console.log('API response received:', { data, error });

      if (error) {
        throw new Error(error.message || 'Update request failed');
      }

      // Handle different response types
      if (data?.status === 'processing') {
        safeToast({
          title: "Itinerary Update Started", 
          description: `Your ${originalDestination} itinerary is being updated. You'll receive a notification when it's ready!`,
          duration: 5000,
        });
      } else if (data?.itinerary) {
        // Immediate update response
        safeToast({
          title: "Itinerary Updated",
          description: "Your itinerary has been updated successfully.",
        });
      }
      
    } catch (error) {
      console.error('Error updating itinerary:', error);
      
      safeToast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update itinerary. Please try again.",
        variant: "destructive"
      });
    }
  }, [hasValidIterData, iterData, originalDestination, localStartDate, localEndDate, localBudget, localHolidayTypes, itinerary, hasChanges, safeToast]);

  // Early return if missing critical data for editing functionality
  if (iterData && !hasValidIterData) {
    console.warn('StructuredItinerary: Invalid iterData provided');
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading itinerary data...</p>
      </div>
    );
  }

  return (
    <div className="-mx-6 lg:-mx-8">
      {/* Header with Update Dropdown */}
      <div className="px-6 lg:px-8 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Iter</h2>
          {iterData && hasValidIterData && (
            <ItineraryUpdateDropdown
              iterData={{
                ...iterData,
                destination: safeDestination,
                itinerary_content: itinerary,
                is_owner: Boolean(iterData.is_owner), // Ensure boolean
                can_edit: Boolean(iterData.can_edit)  // Ensure boolean
              }}
              hasChanges={hasChanges()}
              onUpdate={handleUpdate}
              onIterUpdated={(newContent: string, newDestination?: string) => {
                console.log('StructuredItinerary received update:', { newContent, newDestination });
                if (onIterUpdated) {
                  onIterUpdated(newContent, newDestination);
                }
              }}
            />
          )}
        </div>
      </div>

      <div className="space-y-4 px-6 lg:px-8">
        {/* Trip Overview Map - Full Width */}
        {parsed.destinations.length > 0 && (
          <div className="bg-muted/20 rounded-lg p-4 border border-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Trip Overview</h3>
            </div>
            <div className="rounded-md overflow-hidden">
              <InteractiveItineraryMap destinations={parsed.destinations} />
            </div>
          </div>
        )}

        {/* Trip Summary Section */}
        <div className="space-y-3">
          {/* Short Summary */}
          <div>
          <p className="text-sm text-muted-foreground">
            {getItinerarySummary()}
          </p>
          </div>
          
          {/* 3-Row Layout for Better Mobile Display */}
          <div className="space-y-3">
            {/* Row 1: Dates Only */}
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Dates:</span>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto font-normal text-foreground hover:bg-muted underline">
                      {localStartDate ? format(localStartDate, 'MMM d, yyyy') : 'Start date'}
                      <Edit3 className="h-3 w-3 ml-1 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={localStartDate}
                       onSelect={(date) => {
                         if (date && localEndDate && date > localEndDate) {
                           // If new start date is after end date, adjust end date
                           setLocalEndDate(date);
                           setLocalStartDate(date);
                         } else {
                           setLocalStartDate(date);
                         }
                       }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <span className="text-muted-foreground">to</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto font-normal text-foreground hover:bg-muted underline">
                      {localEndDate ? format(localEndDate, 'MMM d, yyyy') : 'End date'}
                      <Edit3 className="h-3 w-3 ml-1 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={localEndDate}
                       onSelect={(date) => {
                         if (date && localStartDate && date < localStartDate) {
                           // If new end date is before start date, adjust start date
                           setLocalStartDate(date);
                           setLocalEndDate(date);
                         } else {
                           setLocalEndDate(date);
                         }
                       }}
                       disabled={(date) => localStartDate ? date < localStartDate : false}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            </div>

            {/* Row 2: Airports */}
            {airportCodes.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Airports:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {airportCodes.map((code, index) => (
                    <React.Fragment key={code}>
                      <a
                        href={`https://www.skyscanner.com/flights-to/${code.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 underline font-medium"
                      >
                        {code}
                      </a>
                      {index < airportCodes.length - 1 && (
                        <span className="text-muted-foreground">•</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Row 3: Holiday Type and Budget */}
            <div className="flex items-start gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground flex-shrink-0">Type:</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto font-normal text-foreground hover:bg-muted underline text-left">
                       {localHolidayTypes.length > 0 
                         ? localHolidayTypes.length === 1 
                           ? localHolidayTypes[0]
                           : `${localHolidayTypes.length} selected`
                         : 'Select types'
                       }
                      <Edit3 className="h-3 w-3 ml-1 opacity-50 flex-shrink-0" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Holiday Types</DialogTitle>
                      <DialogDescription>Choose your holiday types</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 py-4">
                      {availableHolidayTypes.map((type) => (
                        <Button
                          key={type}
                          variant={localHolidayTypes.includes(type) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleHolidayType(type)}
                          className="justify-start text-left h-auto py-2"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                    {localHolidayTypes.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">Selected: {localHolidayTypes.join(", ")}</p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground flex-shrink-0">Budget:</span>
                <Select value={localBudget.toString()} onValueChange={(value) => setLocalBudget(parseInt(value))}>
                  <SelectTrigger className="w-auto h-7 px-2 text-xs border-0 bg-transparent text-foreground underline font-normal hover:bg-muted">
                    <SelectValue>
                      {getBudgetDisplay(localBudget)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">$ Budget-friendly</SelectItem>
                    <SelectItem value="2">$$ Moderate</SelectItem>
                    <SelectItem value="3">$$$ Comfortable</SelectItem>
                    <SelectItem value="4">$$$$ Luxury</SelectItem>
                    <SelectItem value="5">$$$$$ Ultra-luxury</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

        {/* Dropdown Sections - Full Width */}
        <div className="space-y-3">
        {/* Day-by-Day Section */}
        {parsed.days.length > 0 && (
          <Collapsible 
            open={expandedSections.days} 
            onOpenChange={() => toggleSection('days')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors rounded-lg p-4 border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-blue-800 dark:text-blue-200">Day-by-Day Itinerary</span>
                  </div>
                  {expandedSections.days ? <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="space-y-4">
                  {parsed.days.map((day, index) => (
                    <div key={index} className="border-l-2 border-l-muted pl-4">
                      <h4 className="font-medium text-foreground mb-2">{day.title}</h4>
                      <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                        {renderContentWithLinks(day.content)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Getting There Section */}
        {parsed.gettingThere && (
          <Collapsible 
            open={expandedSections.gettingThere} 
            onOpenChange={() => toggleSection('gettingThere')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">Getting There</span>
                  </div>
                  {expandedSections.gettingThere ? <ChevronUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {renderContentWithLinks(parsed.gettingThere)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Perfect Stay Section */}
        {parsed.perfectStay && (
          <Collapsible 
            open={expandedSections.perfectStay} 
            onOpenChange={() => toggleSection('perfectStay')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors rounded-lg p-4 border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold text-purple-800 dark:text-purple-200">Perfect Stay</span>
                  </div>
                  {expandedSections.perfectStay ? <ChevronUp className="h-4 w-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {renderContentWithLinks(parsed.perfectStay)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Travel Tips Section */}
        {parsed.travelTips && (
          <Collapsible 
            open={expandedSections.travelTips} 
            onOpenChange={() => toggleSection('travelTips')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors rounded-lg p-4 border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="font-semibold text-orange-800 dark:text-orange-200">Essential Travel Tips</span>
                  </div>
                  {expandedSections.travelTips ? <ChevronUp className="h-4 w-4 text-orange-600 dark:text-orange-400" /> : <ChevronDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {renderContentWithLinks(parsed.travelTips)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Booking Links Section */}
        {parsed.bookingLinks && (
          <Collapsible 
            open={expandedSections.booking} 
            onOpenChange={() => toggleSection('booking')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors rounded-lg p-4 border border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-semibold text-rose-800 dark:text-rose-200">Booking & Tips</span>
                  </div>
                  {expandedSections.booking ? <ChevronUp className="h-4 w-4 text-rose-600 dark:text-rose-400" /> : <ChevronDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {renderContentWithLinks(parsed.bookingLinks)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        </div>
      </div>
      <SavedRecommendationModal
        isOpen={showRecommendationModal}
        onClose={() => {
          setShowRecommendationModal(false);
          setSelectedVenue(null);
        }}
        venueName={selectedVenue || ''}
        recommendations={selectedVenue ? (friendRecommendations[selectedVenue] || []) : []}
      />
    </div>
  );
};