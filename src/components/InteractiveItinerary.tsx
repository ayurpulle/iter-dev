import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FriendRecommendation {
  name: string;
  avatar?: string;
  review: string;
  rating?: number;
  visitDate?: string;
}

interface InteractiveItineraryProps {
  itinerary: string;
  friendRecommendations: { [key: string]: FriendRecommendation[] };
}

const InteractiveItinerary = ({ itinerary, friendRecommendations }: InteractiveItineraryProps) => {
  const [expandedVenues, setExpandedVenues] = useState<{ [key: string]: boolean }>({});

  const toggleVenue = (venueName: string) => {
    setExpandedVenues(prev => ({
      ...prev,
      [venueName]: !prev[venueName]
    }));
  };

  const renderItineraryWithRecommendations = (text: string) => {
    // Split text by lines and process each line
    return text.split('\n').map((line, lineIdx) => {
      if (line.trim() === '') return <div key={lineIdx} className="h-2" />;
      
      // Check for friend recommendation markers
      const friendRecMatch = line.match(/\[FRIEND_REC:([^\]]+)\]/g);
      
      if (friendRecMatch) {
        let processedLine = line;
        const venues: string[] = [];
        
        friendRecMatch.forEach(match => {
          const venueName = match.replace('[FRIEND_REC:', '').replace(']', '');
          venues.push(venueName);
          processedLine = processedLine.replace(match, `<VENUE:${venueName}>`);
        });
        
        // Split by venue markers and render with interactive elements
        const parts = processedLine.split(/<VENUE:([^>]+)>/);
        
        return (
          <div key={lineIdx} className="mb-2">
            {parts.map((part, partIdx) => {
              const venueName = venues.find(v => part === v);
              
              if (venueName && friendRecommendations[venueName]) {
                const recommendations = friendRecommendations[venueName];
                const isExpanded = expandedVenues[venueName];
                
                return (
                  <span key={partIdx} className="inline-block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-primary hover:bg-primary/10 font-medium"
                      onClick={() => toggleVenue(venueName)}
                    >
                      {venueName}
                      <div className="ml-1 flex items-center">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-xs ml-1">{recommendations.length}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </div>
                    </Button>
                    
                    {isExpanded && (
                      <Card className="mt-2 mb-2 border-l-4 border-l-primary">
                        <CardContent className="p-3">
                          <div className="space-y-3">
                            {recommendations.map((rec, recIdx) => (
                              <div key={recIdx} className="flex space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={rec.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {rec.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium truncate">{rec.name}</p>
                                    {rec.rating && (
                                      <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`h-3 w-3 ${
                                              i < rec.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground italic">"{rec.review}"</p>
                                  {rec.visitDate && (
                                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      Visited {rec.visitDate}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </span>
                );
              }
              
              return <span key={partIdx}>{part}</span>;
            })}
          </div>
        );
      }
      
      // Regular line formatting
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-xl font-bold mb-3 text-foreground">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-lg font-semibold mb-2 text-foreground">{line.substring(3)}</h2>;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={lineIdx} className="text-base font-semibold mb-2 text-foreground">{line.slice(2, -2)}</h3>;
      } else if (line.startsWith('- ')) {
        return <p key={lineIdx} className="text-sm text-muted-foreground mb-1 ml-4">{line.substring(2)}</p>;
      } else {
        return <p key={lineIdx} className="text-sm text-foreground mb-2">{line}</p>;
      }
    });
  };

  return (
    <div className="prose prose-sm max-w-none text-foreground">
      {renderItineraryWithRecommendations(itinerary)}
    </div>
  );
};

export default InteractiveItinerary;