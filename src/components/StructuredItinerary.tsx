import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plane, Hotel, MapPin, Clock, DollarSign, ExternalLink, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InteractiveItineraryMap } from './InteractiveItineraryMap';

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
}

export const StructuredItinerary = ({ itinerary, friendRecommendations = {}, destination }: StructuredItineraryProps) => {
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showBookingLinks, setShowBookingLinks] = useState(false);
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});

  const toggleDay = (day: string) => {
    console.log('Toggling day:', day, 'Current state:', expandedDays[day]);
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
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
      } else if (trimmed.includes('**Day')) {
        // Parse individual days
        const dayMatches = trimmed.match(/\*\*Day \d+:.*?\*\*/g);
        if (dayMatches) {
          dayMatches.forEach(dayMatch => {
            const dayContent = trimmed.split(dayMatch)[1]?.split(/\*\*Day \d+:/)[0] || '';
            const dayNumber = dayMatch.match(/Day (\d+)/)?.[1];
            const dayTitle = dayMatch.replace(/\*\*Day \d+: /, '').replace(/\*\*/, '');
            
            parsed.days.push({
              number: dayNumber,
              title: dayTitle,
              content: dayContent.trim()
            });
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

    // Only render actual working links, not placeholder text
    const urlRegex = /(https?:\/\/(?:www\.)?(?:booking\.com|skyscanner\.com|getyourguide\.com|airbnb\.com|expedia\.com|hotels\.com|tripadvisor\.com)[^\s]*)/g;
    
    const processedContent = cleanContent(formatTravelContent(formatTimeBasedContent(content)));
    const parts = processedContent.split(urlRegex);
    
    return parts.map((part, index) => {
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

  const parsed = parseItinerary();

  return (
    <div className="space-y-6">
      {/* Interactive Map */}
      {parsed.destinations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
              Trip Overview Map
            </CardTitle>
            <p className="text-sm text-muted-foreground">Click on markers to learn about each destination</p>
          </CardHeader>
          <CardContent>
            <InteractiveItineraryMap destinations={parsed.destinations} />
          </CardContent>
        </Card>
      )}

      {/* Summary Section */}
      {parsed.summary && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {parsed.summary.split('\n').filter(line => line.trim()).slice(0, 3).map((line, index) => (
                <p key={index} className="text-muted-foreground leading-relaxed">{line.trim()}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show Details Button */}
      <div className="flex justify-center">
        <Button 
          onClick={() => setShowFullDetails(!showFullDetails)}
          variant="outline"
          className="px-8 py-2"
        >
          {showFullDetails ? 'Hide Full Details' : 'Click to See Full Details'}
          {showFullDetails ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {/* Full Details - Collapsible */}
      {showFullDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Flights Section */}
          {parsed.flights && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="h-5 w-5 text-blue-600" />
                  Getting There & Coming Home
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 break-words">
                  {renderContentWithLinks(parsed.flights)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accommodation Section */}
          {parsed.accommodation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="h-5 w-5 text-green-600" />
                  Perfect Stay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 break-words">
                  {renderContentWithLinks(parsed.accommodation)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day by Day Itinerary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-purple-600" />
                Day-by-Day Itinerary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parsed.days.map((day, index) => (
                <Collapsible
                  key={index}
                  open={expandedDays[`day-${day.number}`] ?? false}
                  onOpenChange={() => toggleDay(`day-${day.number}`)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                          Day {day.number}
                        </Badge>
                        <span className="font-medium text-left truncate">{day.title}</span>
                      </div>
                      {expandedDays[`day-${day.number}`] ? (
                        <ChevronUp className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 space-y-3">
                      <div className="text-sm space-y-2 break-words">
                        {renderContentWithLinks(day.content)}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          {/* Practical Tips Section */}
          {parsed.practicalTips && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-orange-600" />
                  Essential Travel Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-3 break-words">
                  {parsed.practicalTips.split('\n').filter(tip => tip.trim()).map((tip, index) => {
                    const cleanTip = tip.trim();
                    if (cleanTip.startsWith('•') || cleanTip.startsWith('-')) {
                      return (
                        <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                          <span className="text-orange-600 mt-0.5">💡</span>
                          <span className="flex-1">{cleanTip.replace(/^[•\-]\s*/, '')}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={index} className="text-muted-foreground leading-relaxed">
                        {renderContentWithLinks(cleanTip)}
                      </p>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Booking Links - Toggleable */}
      {parsed.bookingLinks && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <Button 
              onClick={() => setShowBookingLinks(!showBookingLinks)}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              {showBookingLinks ? 'Hide Booking Links' : 'Show Quick Booking Links'}
              <DollarSign className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          {showBookingLinks && (
            <Card className="animate-in slide-in-from-top-2 duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Quick Booking Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 break-words">
                  {renderContentWithLinks(parsed.bookingLinks)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};