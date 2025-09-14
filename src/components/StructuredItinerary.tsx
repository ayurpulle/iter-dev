import React, { useState } from 'react';
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
import { generateTripSummary } from '@/utils/tripSummaryGenerator';

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
  holidayTypes?: string[];
  budget?: string;
  onUpdateDates?: (startDate: Date, endDate: Date) => void;
  onUpdateItinerary?: (changes: { startDate?: Date; endDate?: Date; holidayTypes?: string[]; budget?: number; destination?: string }) => void;
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
  onUpdateItinerary
}: StructuredItineraryProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);
  const [localHolidayTypes, setLocalHolidayTypes] = useState<string[]>(holidayTypes || []);
  const [localBudget, setLocalBudget] = useState<number>(budget === '1' ? 1 : budget === '2' ? 2 : budget === '3' ? 3 : budget === '4' ? 4 : budget === '5' ? 5 : 3);
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

  // Generate actual brief summary
  const generateBriefSummary = () => {
    const dest = destination || parsed.destinations[0] || 'your destination';
    const days = localStartDate && localEndDate 
      ? Math.ceil((localEndDate.getTime() - localStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const typeStr = localHolidayTypes.length > 0 ? localHolidayTypes[0].toLowerCase() : 'cultural';
    const budgetStr = getBudgetDescription(localBudget).toLowerCase();
    
    if (days) {
      return `A ${days}-day ${typeStr} ${budgetStr} adventure in ${dest}. Experience the best attractions, dining, and culture this destination has to offer.`;
    } else {
      return `A ${typeStr} ${budgetStr} journey to ${dest}. Discover amazing attractions, local cuisine, and unforgettable experiences.`;
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
    const sections = itinerary.split(/(?=FLIGHTS:|ACCOMMODATION:|DAY-BY-DAY|BOOKING LINKS|PRACTICAL TIPS:|SUMMARY:)/);
    const parsed = {
      summary: '',
      flights: '',
      accommodation: '',
      days: [] as any[],
      bookingLinks: '',
      practicalTips: '',
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
      if (trimmed.startsWith('SUMMARY:')) {
        parsed.summary = trimmed.replace('SUMMARY:', '').trim();
      } else if (trimmed.startsWith('FLIGHTS:')) {
        parsed.flights = trimmed.replace('FLIGHTS:', '').trim();
      } else if (trimmed.startsWith('ACCOMMODATION:')) {
        parsed.accommodation = trimmed.replace('ACCOMMODATION:', '').trim();
      } else if (trimmed.includes('**Day') || trimmed.includes('Day ') || trimmed.includes('Days ')) {
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
            
            // Handle both single days and day ranges
            const singleDayMatch = dayMatch.match(/Day (\d+)/i);
            const dayRangeMatch = dayMatch.match(/Days (\d+)-(\d+)/i);
            
            let dayNumber, dayTitle;
            
            if (dayRangeMatch) {
              // For day ranges like "Days 1-2"
              dayNumber = dayRangeMatch[1];
              dayTitle = dayMatch.replace(/\*\*Days? \d+-\d+:?\s*/i, '').replace(/\*\*/g, '').trim();
              if (!dayTitle) {
                dayTitle = `Days ${dayRangeMatch[1]}-${dayRangeMatch[2]}`;
              }
            } else if (singleDayMatch) {
              // For single days like "Day 1"
              dayNumber = singleDayMatch[1];
              dayTitle = dayMatch.replace(/\*\*Day \d+:?\s*/i, '').replace(/\*\*/g, '').trim();
              if (!dayTitle) {
                dayTitle = `Day ${dayNumber}`;
              }
            }
            
            console.log(`Parsing Day ${dayNumber}:`, { dayTitle, contentLength: dayContent.length });
            
            if (dayNumber) {
              parsed.days.push({
                number: dayNumber,
                title: dayTitle,
                content: dayContent.trim()
              });
            }
          });
        }
      } else if (trimmed.startsWith('BOOKING LINKS')) {
        parsed.bookingLinks = trimmed.replace('BOOKING LINKS & TIPS:', '').trim();
      } else if (trimmed.startsWith('PRACTICAL TIPS:')) {
        parsed.practicalTips = trimmed.replace('PRACTICAL TIPS:', '').trim();
      }
    });

    // Set destinations after parsing
    parsed.destinations = getDestinations();
    
    return parsed;
  };

  const renderContentWithLinks = (content: string) => {
    // Enhanced time-based section formatting
    const formatTimeBasedContent = (text: string) => {
      // Match time-based patterns like "Morning", "Afternoon", "Evening", "Lunch", "Dinner", etc.
      const timePattern = /(?:^|\n)((?:Morning|Afternoon|Evening|Lunch|Dinner|Breakfast|Night|Late Morning|Early Evening|Midday|Noon)[:\-\s]*)/gmi;
      
      return text.replace(timePattern, (match, timeLabel) => {
        const cleanLabel = timeLabel.replace(/[::\-\s]*$/, '').trim();
        return `\n**TIME_SECTION:${cleanLabel.toUpperCase()}**\n`;
      });
    };

    // Format travel-related content with better headers
    const formatTravelContent = (text: string) => {
      return text
        .replace(/(?:^|\n)(Getting [Tt]here|Getting to|Travel to|Outbound|Departure)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:GETTING_THERE**\n')
        .replace(/(?:^|\n)(Coming [Hh]ome|Return|Coming back|Homeward|Return Journey)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:COMING_HOME**\n')
        .replace(/(?:^|\n)(Perfect [Ss]tay|Where to [Ss]tay|Accommodation|Hotels?|Stay)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:PERFECT_STAY**\n')
        .replace(/(?:^|\n)(Travel [Tt]ips|Tips|Recommendations|Getting Around)[:\-\s]*/gmi, '\n**TRAVEL_SECTION:TRAVEL_RECOMMENDATIONS**\n');
    };

    // Clean up AI-generated explanatory text
    const cleanContent = (text: string) => {
      return text
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

      // Handle friend recommendations
      const friendRecRegex = /\[FRIEND_REC:([^\]]+)\]/g;
      let friendRecParts = part.split(friendRecRegex);
      
      return friendRecParts.map((recPart, recIndex) => {
        if (recIndex % 2 === 1) {
          // This is a friend recommendation venue name
          const venueName = recPart;
          return (
            <span key={`${index}-${recIndex}`}>
              <span className="font-medium text-blue-700 dark:text-blue-300">{venueName}</span>
              {renderFriendRecommendations(venueName)}
            </span>
          );
        } else {
          // Process the text content for better formatting
          return (
            <span key={`${index}-${recIndex}`} className="whitespace-pre-wrap">
              {recPart.split(/(\*\*[^*]+\*\*)/g).map((textPart, textIndex) => {
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
                  return <span key={textIndex}>{textPart}</span>;
                }
              })}
            </span>
          );
        }
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
    if (startDate) setLocalStartDate(startDate);
    if (endDate) setLocalEndDate(endDate);
    if (holidayTypes && holidayTypes.length > 0) setLocalHolidayTypes(holidayTypes);
    if (budget) setLocalBudget(budget === '1' ? 1 : budget === '2' ? 2 : budget === '3' ? 3 : budget === '4' ? 4 : budget === '5' ? 5 : 3);
  }, [startDate, endDate, holidayTypes, budget]);
  
  // Generate smart trip summary
  const tripSummary = generateTripSummary({
    destination: destination || parsed.destinations[0] || 'Trip',
    startDate,
    endDate,
    holidayTypes
  });

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
    const currentBudgetNumber = budget === '1' ? 1 : budget === '2' ? 2 : budget === '3' ? 3 : budget === '4' ? 4 : budget === '5' ? 5 : 3;
    return localStartDate !== startDate || 
           localEndDate !== endDate ||
           JSON.stringify(localHolidayTypes) !== JSON.stringify(holidayTypes) ||
           localBudget !== currentBudgetNumber;
  };

  const handleUpdate = () => {
    if (onUpdateItinerary && hasChanges()) {
      onUpdateItinerary({
        startDate: localStartDate,
        endDate: localEndDate,
        holidayTypes: localHolidayTypes,
        budget: localBudget,
        destination: originalDestination // Preserve original destination
      });
    }
  };

  return (
    <div className="-mx-6 lg:-mx-8">
      {/* Header with Update Button */}
      <div className="px-6 lg:px-8 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your trip to {destination || parsed.destinations[0] || 'Destination'}</h2>
          {hasChanges() && (
            <Button onClick={handleUpdate} size="sm" className="flex items-center gap-1 px-3 py-1 h-8 text-xs">
              <RefreshCw className="h-3 w-3" />
              Update
            </Button>
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
              {generateBriefSummary()}
            </p>
          </div>
          
          {/* Row 1: Editable Dates */}
          <div className="flex items-center gap-4 text-sm">
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
                      onSelect={(date) => setLocalStartDate(date)}
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
                      onSelect={(date) => setLocalEndDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Airport Codes with Skyscanner Links */}
            {airportCodes.length > 0 && (
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Airports:</span>
                <div className="flex items-center gap-1">
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
          </div>

           {/* Row 2: Holiday Type and Budget */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto font-normal text-foreground hover:bg-muted underline">
                    {localHolidayTypes.length > 0 
                      ? localHolidayTypes.length === 1 
                        ? localHolidayTypes[0]
                        : `${localHolidayTypes.length} selected`
                      : 'Select types'
                    }
                    <Edit3 className="h-3 w-3 ml-1 opacity-50" />
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

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Budget:</span>
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

        {/* Dropdown Sections - Full Width */}
        <div className="space-y-3">
        {/* Day-by-Day Section */}
        {parsed.days.length > 0 && (
          <Collapsible 
            open={expandedSections.days} 
            onOpenChange={() => toggleSection('days')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-4 border border-muted">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Day-by-Day Itinerary
                  </div>
                  {expandedSections.days ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
        {parsed.flights && (
          <Collapsible 
            open={expandedSections.flights} 
            onOpenChange={() => toggleSection('flights')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-4 border border-muted">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-primary" />
                    Getting There
                  </div>
                  {expandedSections.flights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {renderContentWithLinks(parsed.flights)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Perfect Stay Section */}
        {parsed.accommodation && (
          <Collapsible 
            open={expandedSections.accommodation} 
            onOpenChange={() => toggleSection('accommodation')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-4 border border-muted">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-primary" />
                    Perfect Stay
                  </div>
                  {expandedSections.accommodation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {renderContentWithLinks(parsed.accommodation)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Travel Tips Section */}
        {parsed.practicalTips && (
          <Collapsible 
            open={expandedSections.tips} 
            onOpenChange={() => toggleSection('tips')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-4 border border-muted">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Essential Travel Tips
                  </div>
                  {expandedSections.tips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="space-y-3">{renderTipsWithEmojis(parsed.practicalTips)}</div>
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
              <div className="w-full cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-4 border border-muted">
                <div className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Booking & Tips
                  </div>
                  {expandedSections.booking ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
    </div>
  );
};