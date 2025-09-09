import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plane, Hotel, MapPin, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
}

export const StructuredItinerary = ({ itinerary, friendRecommendations = {} }: StructuredItineraryProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDay = (day: string) => {
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
    const sections = itinerary.split(/(?=FLIGHTS:|ACCOMMODATION:|DAY-BY-DAY|BOOKING LINKS|PRACTICAL TIPS:)/);
    const parsed = {
      flights: '',
      accommodation: '',
      days: [] as any[],
      bookingLinks: '',
      practicalTips: ''
    };

    sections.forEach(section => {
      const trimmed = section.trim();
      if (trimmed.startsWith('FLIGHTS:')) {
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

    return parsed;
  };

  const renderContentWithLinks = (content: string) => {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          >
            {part.includes('booking.com') ? 'Book Hotel' : 
             part.includes('skyscanner') ? 'Find Flights' :
             part.includes('getyourguide') ? 'Book Activity' : 'View Link'}
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
              <span className="font-medium text-blue-600">{venueName}</span>
              {renderFriendRecommendations(venueName)}
            </span>
          );
        }
        return <span key={`${index}-${recIndex}`}>{recPart}</span>;
      });
    });
  };

  const parsed = parseItinerary();

  return (
    <div className="space-y-4">
      {/* Flights Section */}
      {parsed.flights && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plane className="h-5 w-5 text-blue-600" />
              Flights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
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
              Accommodation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
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
              open={expandedDays[`day-${day.number}`] ?? true}
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
                    <span className="font-medium text-left">{day.title}</span>
                  </div>
                  {expandedDays[`day-${day.number}`] ?? true ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="text-sm space-y-2 whitespace-pre-line">
                    {renderContentWithLinks(day.content)}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Booking Links */}
      {parsed.bookingLinks && (
        <Collapsible
          open={expandedSections['booking']}
          onOpenChange={() => toggleSection('booking')}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-orange-600" />
                    Booking Links & Tips
                  </div>
                  {expandedSections['booking'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="text-sm space-y-2">
                  {renderContentWithLinks(parsed.bookingLinks)}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Practical Tips */}
      {parsed.practicalTips && (
        <Collapsible
          open={expandedSections['practical']}
          onOpenChange={() => toggleSection('practical')}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-600" />
                    Practical Tips
                  </div>
                  {expandedSections['practical'] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="text-sm space-y-2">
                  {renderContentWithLinks(parsed.practicalTips)}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};