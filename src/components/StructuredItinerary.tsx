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
import { SavedRecommendationModal } from './SavedRecommendationModal';
import { ItineraryUpdateDropdown } from './ItineraryUpdateDropdown';
import InteractiveIter from './InteractiveItinerary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encodeHolidayTypes, encodeBudget, decodeHolidayTypes, decodeBudget } from '@/utils/itineraryConstants';

interface FriendRecommendation {
  name: string;
  avatar?: string;
  review: string;
  rating?: number;
  visitDate?: string;
  postId: string;
}

interface WebRecommendation {
  name: string;
  source: string;
  url: string;
}

interface StructuredItineraryProps {
  itinerary: string;
  friendRecommendations?: { [venueName: string]: FriendRecommendation[] };
  webRecommendations?: { [venueName: string]: WebRecommendation[] };
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
  webRecommendations = {},
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
  
  // State to track the current itinerary content (can be updated via chat)
  const [currentItinerary, setCurrentItinerary] = useState(itinerary);
  const [currentDestination, setCurrentDestination] = useState(destination);
  
  // Update current content when props change
  useEffect(() => {
    setCurrentItinerary(itinerary);
  }, [itinerary]);
  
  useEffect(() => {
    setCurrentDestination(destination);
  }, [destination]);
  
  // Handle itinerary updates from the edit dialog
  const handleIterUpdated = useCallback((newContent: string, newDestination?: string) => {
    console.log('Itinerary updated in StructuredItinerary:', { newContent: newContent.substring(0, 100) + '...', newDestination });
    setCurrentItinerary(newContent);
    if (newDestination) {
      setCurrentDestination(newDestination);
    }
    // Call the parent callback if provided
    onIterUpdated?.(newContent, newDestination);
  }, [onIterUpdated]);
  
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
  // Decode values from iterData or use props as fallback
  const decodedBudget = useMemo(() => {
    if (iterData?.budget !== undefined && iterData?.budget !== null) {
      const budgetValue = typeof iterData.budget === 'number' ? iterData.budget : parseInt(String(iterData.budget));
      return isNaN(budgetValue) ? 3 : Math.max(1, Math.min(5, budgetValue));
    }
    if (typeof budget === 'string' && budget.length > 0) {
      const parsed = parseInt(budget);
      return isNaN(parsed) ? 3 : Math.max(1, Math.min(5, parsed));
    }
    if (typeof budget === 'number') return Math.max(1, Math.min(5, budget));
    return 3;
  }, [budget, iterData?.budget]);
  
  const decodedHolidayTypes = useMemo(() => {
    if (iterData?.interests) {
      return decodeHolidayTypes(iterData.interests);
    }
    return Array.isArray(holidayTypes) ? holidayTypes : [];
  }, [iterData?.interests, holidayTypes]);

  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);
  const [localHolidayTypes, setLocalHolidayTypes] = useState<string[]>(decodedHolidayTypes);
  const [localBudget, setLocalBudget] = useState<number>(decodedBudget);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const { toast } = useToast();

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

  const validateDates = (start: Date | undefined, end: Date | undefined) => {
    if (start && end && start > end) {
      return false;
    }
    return true;
  };

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

  const getAirportsForDestination = (destination: string) => {
    const dest = destination.toLowerCase();
    
    // Major destinations and their primary airports
    const airportMap: { [key: string]: string } = {
      'tokyo': 'NRT • HND',
      'japan': 'NRT • HND',
      'london': 'LHR • LGW',
      'paris': 'CDG • ORY',
      'new york': 'JFK • LGA',
      'los angeles': 'LAX • BUR',
      'san francisco': 'SFO • OAK',
      'miami': 'MIA • FLL',
      'bangkok': 'BKK • DMK',
      'singapore': 'SIN',
      'hong kong': 'HKG',
      'sydney': 'SYD • KSF',
      'melbourne': 'MEL • AVV',
      'dubai': 'DXB • DWC',
      'amsterdam': 'AMS',
      'rome': 'FCO • CIA',
      'berlin': 'BER',
      'madrid': 'MAD',
      'barcelona': 'BCN • GRO',
      'istanbul': 'IST • SAW',
      'beijing': 'PEK • PKX',
      'shanghai': 'PVG • SHA',
      'seoul': 'ICN • GMP',
      'mumbai': 'BOM',
      'delhi': 'DEL',
      'toronto': 'YYZ • YTZ',
      'vancouver': 'YVR • YKA',
      'mexico city': 'MEX • NLU',
      'sao paulo': 'GRU • CGH',
      'rio de janeiro': 'GIG • SDU',
      'cape town': 'CPT',
      'johannesburg': 'JNB • HLA',
      'cairo': 'CAI',
      'montreal': 'YUL • YMX',
      'chicago': 'ORD • MDW',
      'atlanta': 'ATL',
      'las vegas': 'LAS • VGT',
      'seattle': 'SEA • BFI',
      'denver': 'DEN',
      'phoenix': 'PHX • SDL',
      'dallas': 'DFW • DAL',
      'houston': 'IAH • HOU',
      'boston': 'BOS • BED',
      'washington': 'DCA • IAD',
      'philadelphia': 'PHL',
      'detroit': 'DTW',
      'minneapolis': 'MSP',
      'salt lake city': 'SLC',
      'portland': 'PDX',
      'san diego': 'SAN',
      'nashville': 'BNA',
      'austin': 'AUS',
      'orlando': 'MCO • SFB',
      'tampa': 'TPA • PIE'
    };
    
    // Check for exact matches first
    for (const [city, airports] of Object.entries(airportMap)) {
      if (dest.includes(city)) {
        return airports;
      }
    }
    
    // Default fallback
    return 'TBD';
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const parseItinerary = () => {
    console.log('Parsing itinerary content:', currentItinerary?.substring(0, 200));
    
    if (!currentItinerary || typeof currentItinerary !== 'string') {
      console.error('Invalid itinerary content:', currentItinerary);
      return {
        summary: '',
        gettingThere: '',
        perfectStay: '',
        days: [],
        travelTips: '',
        bookingLinks: '',
        destinations: [currentDestination || destination || 'Destination']
      };
    }
    
    // Calculate trip length to determine parsing strategy
    const tripLength = localStartDate && localEndDate 
      ? Math.ceil((localEndDate.getTime() - localStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : 7; // Default to 7 days if no dates
    
    // Split into main sections based on headers
    const sections = currentItinerary.split(/(?=\*\*Trip Summary\*\*|\*\*Getting There\*\*|\*\*Perfect Stay\*\*|\*\*Day-by-Day Itinerary\*\*|\*\*Travel Tips\*\*|\*\*Booking Links\*\*|\*\*Flights\*\*)/);
    
    const parsed = {
      summary: '',
      gettingThere: '',
      perfectStay: '',
      days: [] as any[],
      travelTips: '',
      bookingLinks: '',
      destinations: [] as string[]
    };

    sections.forEach(section => {
      const trimmed = section.trim();
      if (trimmed.startsWith('**Trip Summary**')) {
        parsed.summary = trimmed.replace('**Trip Summary**', '').trim();
      } else if (trimmed.startsWith('**Getting There**') || trimmed.startsWith('**Flights**')) {
        parsed.gettingThere = trimmed.replace(/\*\*(Getting There|Flights)\*\*/, '').trim();
      } else if (trimmed.startsWith('**Perfect Stay**')) {
        parsed.perfectStay = trimmed.replace('**Perfect Stay**', '').trim();
      } else if (trimmed.startsWith('**Day-by-Day Itinerary**')) {
        const content = trimmed.replace('**Day-by-Day Itinerary**', '').trim();
        
        if (tripLength <= 7) {
          // For 1-7 days: Show detailed daily breakdown with morning/afternoon/evening
          const dayMatches = content.match(/(?:\*\*)?Day \d+[^\n]*(?:\*\*)?/gi);
          
          if (dayMatches) {
            dayMatches.forEach((dayMatch) => {
              const dayPattern = dayMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(dayPattern + '([\\s\\S]*?)(?=(?:\\*\\*)?Day \\d+:|$)', 'i');
              const match = content.match(regex);
              const dayContent = match?.[1] || '';
              
              const singleDayMatch = dayMatch.match(/Day (\d+)/i);
              
              if (singleDayMatch) {
                const dayNum = singleDayMatch[1];
                const dayTitle = dayMatch.replace(/\*\*Day \d+:?\s*/i, '').replace(/\*\*/g, '').trim();
                
                parsed.days.push({
                  number: dayNum,
                  title: dayTitle || `Day ${dayNum}`,
                  content: dayContent.trim()
                });
              }
            });
          }
        } else if (tripLength <= 14) {
          // For 7-14 days: Group days in 2s or 3s with brief descriptions
          const dayMatches = content.match(/(?:\*\*)?Days? \d+(?:-\d+)?[^\n]*(?:\*\*)?/gi);
          
          if (dayMatches) {
            dayMatches.forEach((dayMatch) => {
              const dayPattern = dayMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(dayPattern + '([\\s\\S]*?)(?=(?:\\*\\*)?Days? \\d+:|$)', 'i');
              const match = content.match(regex);
              const dayContent = match?.[1] || '';
              
              const dayRangeMatch = dayMatch.match(/Days (\d+)-(\d+)/i);
              const singleDayMatch = dayMatch.match(/Day (\d+)/i);
              
              if (dayRangeMatch) {
                const startDay = dayRangeMatch[1];
                const endDay = dayRangeMatch[2];
                const dayTitle = dayMatch.replace(/\*\*Days? \d+-\d+:?\s*/i, '').replace(/\*\*/g, '').trim();
                
                parsed.days.push({
                  number: startDay,
                  title: dayTitle || `Days ${startDay}-${endDay}`,
                  content: dayContent.trim(),
                  isRange: true,
                  endDay: endDay
                });
              } else if (singleDayMatch) {
                const dayNum = singleDayMatch[1];
                const dayTitle = dayMatch.replace(/\*\*Day \d+:?\s*/i, '').replace(/\*\*/g, '').trim();
                
                parsed.days.push({
                  number: dayNum,
                  title: dayTitle || `Day ${dayNum}`,
                  content: dayContent.trim()
                });
              }
            });
          }
        } else {
          // For 14+ days: Group by 3-4 days with brief descriptions
          const dayMatches = content.match(/(?:\*\*)?Days? \d+(?:-\d+)?[^\n]*(?:\*\*)?/gi);
          
          if (dayMatches) {
            dayMatches.forEach((dayMatch) => {
              const dayPattern = dayMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(dayPattern + '([\\s\\S]*?)(?=(?:\\*\\*)?Days? \\d+:|$)', 'i');
              const match = content.match(regex);
              const dayContent = match?.[1] || '';
              
              const dayRangeMatch = dayMatch.match(/Days (\d+)-(\d+)/i);
              const singleDayMatch = dayMatch.match(/Day (\d+)/i);
              
              if (dayRangeMatch) {
                const startDay = dayRangeMatch[1];
                const endDay = dayRangeMatch[2];
                const dayTitle = dayMatch.replace(/\*\*Days? \d+-\d+:?\s*/i, '').replace(/\*\*/g, '').trim();
                
                parsed.days.push({
                  number: startDay,
                  title: dayTitle || `Days ${startDay}-${endDay}`,
                  content: dayContent.trim(),
                  isRange: true,
                  endDay: endDay
                });
              } else if (singleDayMatch) {
                const dayNum = singleDayMatch[1];
                const dayTitle = dayMatch.replace(/\*\*Day \d+:?\s*/i, '').replace(/\*\*/g, '').trim();
                
                parsed.days.push({
                  number: dayNum,
                  title: dayTitle || `Day ${dayNum}`,
                  content: dayContent.trim()
                });
              }
            });
          }
        }
      } else if (trimmed.startsWith('**Travel Tips**') || trimmed.startsWith('**Essential Travel Tips**')) {
        parsed.travelTips = trimmed.replace(/\*\*(Travel Tips|Essential Travel Tips)\*\*/, '').trim();
      } else if (trimmed.startsWith('**Booking Links**') || trimmed.startsWith('**Booking & Tips**')) {
        parsed.bookingLinks = trimmed.replace(/\*\*(Booking Links|Booking & Tips)\*\*/, '').trim();
      }
    });

    parsed.destinations = [currentDestination || destination || 'Destination'];
    return parsed;
  };

  const formatContentForDisplay = (content: string) => {
    if (!content) return null;
    
    // Clean up content - remove excessive dashes and clean formatting
    let cleanContent = content
      .replace(/---+/g, '') // Remove long dashes
      .replace(/\*{3,}/g, '**') // Replace triple+ asterisks with double
      .replace(/(\*\*[^*]+\*\*)\s*-+\s*/g, '$1 ') // Remove dashes after bold headers
      .replace(/^\s*-+\s*/gm, '• ') // Convert leading dashes to bullets
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim();

    // Split into sections and format each
    const sections = cleanContent.split(/\n\s*\n/);
    
    return sections.map((section, index) => {
      if (!section.trim()) return null;
      
      // Check if this is a header (bold text at start)
      const isHeader = section.trim().startsWith('**') && section.trim().endsWith('**');
      
      if (isHeader) {
        const headerText = section.replace(/\*\*/g, '').trim();
        return (
          <h4 key={index} className="font-semibold text-foreground mb-2 mt-4 first:mt-0">
            {headerText}
          </h4>
        );
      }
      
      // Process bullet points
      const lines = section.split('\n').filter(line => line.trim());
      const hasBullets = lines.some(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
      
      if (hasBullets) {
        return (
          <ul key={index} className="space-y-1 mb-4">
            {lines.map((line, lineIndex) => {
              const cleanLine = line.replace(/^[•\-]\s*/, '').trim();
              if (!cleanLine) return null;
              
              return (
                <li key={lineIndex} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5">•</span>
                  <span className="text-sm leading-relaxed">{formatInlineContent(cleanLine)}</span>
                </li>
              );
            })}
          </ul>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-sm leading-relaxed mb-3 text-foreground/90">
          {formatInlineContent(section)}
        </p>
      );
    });
  };

  const formatInlineContent = (text: string) => {
    // Enhanced URL detection pattern
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlPattern);
    
    return parts.map((part, partIndex) => {
      if (part.match(urlPattern)) {
        const url = part.startsWith('http') ? part : `https://${part}`;
        const displayText = part.length > 40 ? part.substring(0, 37) + '...' : part;
        
        return (
          <a
            key={partIndex}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          >
            {displayText}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      
      // Remove ** formatting from text but don't process as bold
      const cleanedPart = part.replace(/\*\*/g, '');
      return cleanedPart;
    });
  };

  const getItinerarySummary = () => {
    const parsed = parseItinerary();
    
    if (parsed.summary && parsed.summary.trim()) {
      return parsed.summary.trim();
    }
    
    const dest = destination || parsed.destinations[0] || 'your destination';
    const days = localStartDate && localEndDate 
      ? Math.ceil((localEndDate.getTime() - localStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const primaryType = localHolidayTypes.length > 0 ? localHolidayTypes[0] : 'Cultural & Historical';
    const budgetStr = getBudgetDescription(localBudget).toLowerCase();
    
    if (days) {
      const duration = days <= 7 ? `${days}-day` : days <= 14 ? `${days}-day` : `${Math.ceil(days/7)}-week`;
      return `${duration} ${primaryType.toLowerCase()} adventure in ${dest}. ${budgetStr.charAt(0).toUpperCase() + budgetStr.slice(1)} experiences with curated recommendations.`;
    } else {
      return `${primaryType} journey in ${dest}. ${budgetStr.charAt(0).toUpperCase() + budgetStr.slice(1)} experiences tailored to your interests.`;
    }
  };

  if (!currentItinerary) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>No itinerary content available. Please try generating a new itinerary.</p>
      </div>
    );
  }

  const parsed = parseItinerary();
  const summary = getItinerarySummary();

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Edit and Update Controls at the top */}
      {iterData && (
        <div className="flex justify-end">
          <ItineraryUpdateDropdown
            iterData={iterData}
            hasChanges={false}
            onUpdate={() => {}}
            onIterUpdated={handleIterUpdated}
          />
        </div>
      )}

      {/* Interactive Map - ABOVE summary */}
      <div className="relative">
        <InteractiveItineraryMap
          destinations={[currentDestination || destination || 'Unknown']}
          className="w-full h-64 rounded-lg"
        />
      </div>

      {/* Trip Summary - BELOW map */}
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-foreground/80 leading-relaxed text-base">
            {summary}
          </p>
        </div>
      </div>

      {/* Trip Details in 2x2 grid like your image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dates */}
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-background">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Dates:</span>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto underline font-normal text-blue-600">
                  {localStartDate ? format(localStartDate, 'MMM dd, yyyy') : 'Select start'}
                </Button>
              </PopoverTrigger>
               <PopoverContent className="w-80 p-0 z-50 bg-background border shadow-md" align="start">
                <CalendarComponent
                  mode="single"
                  selected={localStartDate}
                  onSelect={(date) => {
                    if (date && validateDates(date, localEndDate)) {
                      setLocalStartDate(date);
                      if (onUpdateDates && localEndDate) {
                        onUpdateDates(date, localEndDate);
                      }
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto underline font-normal text-blue-600">
                  {localEndDate ? format(localEndDate, 'MMM dd, yyyy') : 'Select end'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 z-50 bg-background border shadow-md" align="start">
                <CalendarComponent
                  mode="single"
                  selected={localEndDate}
                  onSelect={(date) => {
                    if (date && validateDates(localStartDate, date)) {
                      setLocalEndDate(date);
                      if (onUpdateDates && localStartDate) {
                        onUpdateDates(localStartDate, date);
                      }
                    }
                  }}
                  disabled={(date) => {
                    if (!localStartDate) return false;
                    return date < localStartDate;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Airports */}
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-background">
          <Plane className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Airports:</span>
          <span className="text-sm text-blue-600 underline">{getAirportsForDestination(currentDestination || destination || '')}</span>
        </div>

        {/* Holiday Types */}
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-background">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Type:</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto underline font-normal text-blue-600">
                {localHolidayTypes.length > 0 ? `${localHolidayTypes.length} selected` : 'Select types'}
              </Button>
            </DialogTrigger>
            <DialogContent className="z-50 bg-background border shadow-md">
              <DialogHeader>
                <DialogTitle>Holiday Types</DialogTitle>
                <DialogDescription>
                  Select the types of holiday experiences you're interested in.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {availableHolidayTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={type}
                      checked={localHolidayTypes.includes(type)}
                      onChange={() => toggleHolidayType(type)}
                      className="rounded"
                    />
                    <label htmlFor={type} className="text-sm">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget */}
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-background">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Budget:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto underline font-normal text-blue-600">
                {getBudgetDisplay(localBudget)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 z-50 bg-background border shadow-md" align="start">
              <div className="p-4 space-y-2">
                <div className="text-sm font-medium mb-3">Select Budget Range</div>
                {[1, 2, 3, 4, 5].map((budgetLevel) => (
                  <Button
                    key={budgetLevel}
                    variant={localBudget === budgetLevel ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setLocalBudget(budgetLevel);
                      if (onUpdateItinerary) {
                        onUpdateItinerary({ 
                          budget: budgetLevel,
                          startDate: localStartDate,
                          endDate: localEndDate,
                          holidayTypes: localHolidayTypes 
                        });
                      }
                    }}
                  >
                    <span className="font-mono text-lg mr-3">{getBudgetDisplay(budgetLevel)}</span>
                    <span className="text-sm">{getBudgetDescription(budgetLevel)}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Individual Dropdown Sections - Remove Budget from here since it's in grid above */}
      <div className="space-y-3">

        {/* Day-by-Day Itinerary */}
        <Collapsible
          open={expandedSections['itinerary'] ?? true}
          onOpenChange={() => toggleSection('itinerary')}
        >
          <CollapsibleTrigger asChild>
            <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-lg font-semibold">Day-by-Day Itinerary</span>
                </div>
                {expandedSections['itinerary'] ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-6 border rounded-lg bg-background">
              {parsed.days.length > 0 ? (
                <div className="space-y-6">
                  {parsed.days.map((day, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-4">
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {day.isRange ? `Days ${day.number}-${day.endDay}` : `Day ${day.number}`}
                        </span>
                        {day.title && (
                          <span className="text-foreground/80">{day.title}</span>
                        )}
                      </h3>
                       <div className="space-y-2">
                         <InteractiveIter 
                           itinerary={day.content} 
                           friendRecommendations={friendRecommendations}
                           webRecommendations={webRecommendations}
                         />
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No day-by-day itinerary content found.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Getting There */}
        {parsed.gettingThere && (
          <Collapsible
            open={expandedSections['gettingThere'] ?? false}
            onOpenChange={() => toggleSection('gettingThere')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-green-500" />
                    <span className="text-lg font-semibold">Getting There</span>
                  </div>
                  {expandedSections['gettingThere'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-6 border rounded-lg bg-background">
                 <div className="space-y-2">
                   <InteractiveIter 
                     itinerary={parsed.gettingThere} 
                     friendRecommendations={friendRecommendations}
                     webRecommendations={webRecommendations}
                   />
                 </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Perfect Stay */}
        {parsed.perfectStay && (
          <Collapsible
            open={expandedSections['perfectStay'] ?? false}
            onOpenChange={() => toggleSection('perfectStay')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Hotel className="h-5 w-5 text-purple-500" />
                    <span className="text-lg font-semibold">Perfect Stay</span>
                  </div>
                  {expandedSections['perfectStay'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-6 border rounded-lg bg-background">
                 <div className="space-y-2">
                   <InteractiveIter 
                     itinerary={parsed.perfectStay} 
                     friendRecommendations={friendRecommendations}
                     webRecommendations={webRecommendations}
                   />
                 </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Essential Travel Tips */}
        {parsed.travelTips && (
          <Collapsible
            open={expandedSections['travelTips'] ?? false}
            onOpenChange={() => toggleSection('travelTips')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-orange-500" />
                    <span className="text-lg font-semibold">Essential Travel Tips</span>
                  </div>
                  {expandedSections['travelTips'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-6 border rounded-lg bg-background">
                 <div className="space-y-2">
                   <InteractiveIter 
                     itinerary={parsed.travelTips} 
                     friendRecommendations={friendRecommendations}
                     webRecommendations={webRecommendations}
                   />
                 </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Booking Links */}
        {parsed.bookingLinks && (
          <Collapsible
            open={expandedSections['bookingLinks'] ?? false}
            onOpenChange={() => toggleSection('bookingLinks')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-5 w-5 text-red-500" />
                    <span className="text-lg font-semibold">Booking & Tips</span>
                  </div>
                  {expandedSections['bookingLinks'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-6 border rounded-lg bg-background">
                 <div className="space-y-2">
                   <InteractiveIter 
                     itinerary={parsed.bookingLinks} 
                     friendRecommendations={friendRecommendations}
                     webRecommendations={webRecommendations}
                   />
                 </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <SavedRecommendationModal
        isOpen={showRecommendationModal}
        onClose={() => {
          setShowRecommendationModal(false);
          setSelectedVenue(null);
        }}
        venueName={selectedVenue || ""}
        recommendations={selectedVenue ? (friendRecommendations[selectedVenue] || []) : []}
      />
    </div>
  );
};