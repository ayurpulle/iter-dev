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
    
    // Split into main sections based on headers
    const sections = currentItinerary.split(/(?=\*\*Trip Summary\*\*|\*\*Getting There\*\*|\*\*Perfect Stay\*\*|\*\*Day-by-Day Itinerary\*\*|\*\*Travel Tips\*\*|\*\*Booking Links\*\*)/);
    
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
      } else if (trimmed.startsWith('**Getting There**')) {
        parsed.gettingThere = trimmed.replace('**Getting There**', '').trim();
      } else if (trimmed.startsWith('**Perfect Stay**')) {
        parsed.perfectStay = trimmed.replace('**Perfect Stay**', '').trim();
      } else if (trimmed.startsWith('**Day-by-Day Itinerary**') || trimmed.includes('**Day') || trimmed.includes('Day ') || trimmed.includes('Days ')) {
        const content = trimmed;
        const dayMatches = content.match(/(?:\*\*)?Days? \d+(?:-\d+)?:?[^\n]*(?:\*\*)?/gi);
        
        if (dayMatches) {
          dayMatches.forEach((dayMatch, matchIndex) => {
            const dayPattern = dayMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(dayPattern + '([\\s\\S]*?)(?=(?:\\*\\*)?Days? \\d+:|$)', 'i');
            const match = content.match(regex);
            const dayContent = match?.[1] || '';
            
            const singleDayMatch = dayMatch.match(/Day (\d+)/i);
            const dayRangeMatch = dayMatch.match(/Days (\d+)-(\d+)/i);
            
            let dayNum, dayTitle;
            
            if (dayRangeMatch) {
              dayNum = dayRangeMatch[1];
              dayTitle = dayMatch.replace(/\*\*Days? \d+-\d+:?\s*/i, '').replace(/\*\*/g, '').trim();
              if (!dayTitle) {
                dayTitle = `Days ${dayRangeMatch[1]}-${dayRangeMatch[2]}`;
              }
            } else if (singleDayMatch) {
              dayNum = singleDayMatch[1];
              dayTitle = dayMatch.replace(/\*\*Day \d+:?\s*/i, '').replace(/\*\*/g, '').trim();
              if (!dayTitle) {
                dayTitle = `Day ${dayNum}`;
              }
            }
            
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

    parsed.destinations = [currentDestination || destination || 'Destination'];
    return parsed;
  };

  const renderContentWithLinks = (content: string) => {
    if (!content) return null;
    
    // Split content into paragraphs and process each one
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      if (!paragraph.trim()) return null;
      
      // Enhanced URL detection pattern
      const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const parts = paragraph.split(urlPattern);
      
      return (
        <div key={index} className="mb-4">
          {parts.map((part, partIndex) => {
            if (part.match(urlPattern)) {
              const url = part.startsWith('http') ? part : `https://${part}`;
              const displayText = part.length > 50 ? part.substring(0, 47) + '...' : part;
              
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
            
            // Process bold text
            const boldPattern = /\*\*(.*?)\*\*/g;
            const boldParts = part.split(boldPattern);
            
            return boldParts.map((boldPart, boldIndex) => {
              if (boldIndex % 2 === 1) {
                return <strong key={boldIndex}>{boldPart}</strong>;
              }
              return boldPart;
            });
          })}
        </div>
      );
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
      return `Embark on a ${duration} ${primaryType.toLowerCase()} adventure in ${dest}. This ${budgetStr} itinerary combines authentic experiences with carefully curated recommendations to create unforgettable memories.`;
    } else {
      return `Discover the essence of ${dest} through this ${primaryType.toLowerCase()} journey. Experience the destination's unique character with ${budgetStr} recommendations tailored to your interests.`;
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

      {/* Interactive Map */}
      <div className="relative">
        <InteractiveItineraryMap
          destinations={[currentDestination || destination || 'Unknown']}
          className="w-full h-64 rounded-lg"
        />
      </div>

      {/* Trip Summary */}
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-foreground/80 leading-relaxed text-base">
            {summary}
          </p>
        </div>
      </div>

      {/* Trip Details Grid - 2x2 layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dates */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Dates:</span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto underline font-normal text-blue-600">
                    {localStartDate ? format(localStartDate, 'MMM dd, yyyy') : 'Select start'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-background border shadow-md" align="start">
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
                <PopoverContent className="w-auto p-0 z-50 bg-background border shadow-md" align="start">
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
          <Edit3 className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Airports */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Airports:</span>
            <span className="text-sm text-blue-600 underline">NRT • HND</span>
          </div>
        </div>

        {/* Holiday Types */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
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
          <Edit3 className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Budget */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Budget:</span>
            <Select
              value={localBudget.toString()}
              onValueChange={(value) => {
                const newBudget = parseInt(value);
                setLocalBudget(newBudget);
              }}
            >
              <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent">
                <SelectValue>
                  <Button variant="ghost" size="sm" className="p-0 h-auto underline font-normal text-blue-600">
                    {getBudgetDisplay(localBudget)}
                  </Button>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-md">
                {[1, 2, 3, 4, 5].map(level => (
                  <SelectItem key={level} value={level.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{getBudgetDisplay(level)}</span>
                      <span className="text-muted-foreground text-xs">
                        {getBudgetDescription(level)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Edit3 className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Main Content Sections - Clean collapsible format */}
      <div className="space-y-3">
        {/* Day-by-Day Itinerary */}
        <Collapsible
          open={expandedSections['itinerary'] ?? true}
          onOpenChange={() => toggleSection('itinerary')}
        >
          <CollapsibleTrigger asChild>
            <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors border-blue-200 bg-blue-50/20">
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
            <div className="mt-2 p-6 border rounded-lg border-blue-200 bg-background">
              {parsed.days.length > 0 ? (
                <div className="space-y-6">
                  {parsed.days.map((day, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-4">
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {day.title || `Day ${day.number}`}
                        </span>
                      </h3>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {renderContentWithLinks(day.content)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {renderContentWithLinks(currentItinerary)}
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
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors border-green-200 bg-green-50/20">
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
              <div className="mt-2 p-6 border rounded-lg border-green-200 bg-background">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {renderContentWithLinks(parsed.gettingThere)}
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
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors border-purple-200 bg-purple-50/20">
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
              <div className="mt-2 p-6 border rounded-lg border-purple-200 bg-background">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {renderContentWithLinks(parsed.perfectStay)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Travel Tips */}
        {parsed.travelTips && (
          <Collapsible
            open={expandedSections['travelTips'] ?? false}
            onOpenChange={() => toggleSection('travelTips')}
          >
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors border-orange-200 bg-orange-50/20">
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
              <div className="mt-2 p-6 border rounded-lg border-orange-200 bg-background">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {renderContentWithLinks(parsed.travelTips)}
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
              <div className="w-full p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors border-red-200 bg-red-50/20">
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
              <div className="mt-2 p-6 border rounded-lg border-red-200 bg-background">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {renderContentWithLinks(parsed.bookingLinks)}
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
        venueName={selectedVenue || ''}
        recommendations={selectedVenue ? (friendRecommendations[selectedVenue] || []) : []}
      />
    </div>
  );
};