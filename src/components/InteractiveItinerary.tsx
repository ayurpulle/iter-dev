import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SavedRecommendationModal } from "@/components/SavedRecommendationModal";

interface FriendRecommendation {
  name: string;
  avatar?: string;
  review: string;
  rating?: number;
  visitDate?: string;
  postId: string;
}

interface InteractiveIterProps {
  itinerary: string;
  friendRecommendations: { [key: string]: FriendRecommendation[] };
}

const InteractiveIter = ({ itinerary, friendRecommendations }: InteractiveIterProps) => {
  const [expandedVenues, setExpandedVenues] = useState<{ [key: string]: boolean }>({});
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  const toggleVenue = (venueName: string) => {
    setExpandedVenues(prev => ({
      ...prev,
      [venueName]: !prev[venueName]
    }));
  };

  const renderIterWithRecommendations = (text: string) => {
    // Split text by lines and process each line
    return text.split('\n').map((line, lineIdx) => {
      if (line.trim() === '') return <div key={lineIdx} className="h-2" />;
      
      // Check for friend recommendation markers - support both old and new formats
      const friendRecMatch = line.match(/\[(?:FRIEND_REC|SAVED_REC):([^\]]+)\]/g);
      
      if (friendRecMatch) {
        let processedLine = line;
        const venues: string[] = [];
        
        friendRecMatch.forEach(match => {
          const venueName = match.replace(/\[(?:FRIEND_REC|SAVED_REC):/, '').replace(']', '');
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
                
                return (
                  <span key={partIdx} className="inline-block relative">
                    <span 
                      className="text-primary hover:text-primary/80 cursor-pointer font-medium underline decoration-primary/50 hover:decoration-primary transition-colors"
                      onClick={() => setSelectedVenue(venueName)}
                    >
                      {venueName}
                    </span>
                    <span 
                      className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full ml-1 cursor-pointer hover:bg-primary/80 transition-colors"
                      onClick={() => setSelectedVenue(venueName)}
                    >
                      +{recommendations.length}
                    </span>
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
    <>
      <div className="prose prose-sm max-w-none text-foreground">
        {renderIterWithRecommendations(itinerary)}
      </div>
      
      {selectedVenue && friendRecommendations[selectedVenue] && (
        <SavedRecommendationModal
          isOpen={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
          venueName={selectedVenue}
          recommendations={friendRecommendations[selectedVenue]}
        />
      )}
    </>
  );
};

export default InteractiveIter;