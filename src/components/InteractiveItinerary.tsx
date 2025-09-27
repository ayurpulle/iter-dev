import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SavedRecommendationModal } from "@/components/SavedRecommendationModal";
import { WebRecommendationModal } from "@/components/WebRecommendationModal";

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

interface InteractiveIterProps {
  itinerary: string;
  friendRecommendations: { [key: string]: FriendRecommendation[] };
  webRecommendations?: { [key: string]: WebRecommendation[] };
}

const InteractiveIter = ({ itinerary, friendRecommendations, webRecommendations = {} }: InteractiveIterProps) => {
  const [expandedVenues, setExpandedVenues] = useState<{ [key: string]: boolean }>({});
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [selectedWebVenue, setSelectedWebVenue] = useState<string | null>(null);

  const toggleVenue = (venueName: string) => {
    setExpandedVenues(prev => ({
      ...prev,
      [venueName]: !prev[venueName]
    }));
  };

  const renderIterWithRecommendations = (text: string) => {
    // Clean up markdown formatting first
    let cleanedText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove ** markdown formatting
      .replace(/\*([^*]+)\*/g, '$1'); // Remove * markdown formatting
    
    // Remove exposed URLs and create web recommendation markers
    cleanedText = cleanedText
      .replace(/\(booking link:\s*(https?:\/\/[^\)]+)\)/gi, '') // Remove booking link URLs
      .replace(/booking link:\s*(https?:\/\/[^\s,;.]+)/gi, '') // Remove standalone booking links
      .replace(/\b(https?:\/\/[^\s,;.]+)/gi, '') // Remove any other exposed URLs
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .trim();
    
    // Split content by time periods and format as bullet points
    const timePattern = /(Morning|Afternoon|Evening|Night):\s*/gi;
    const parts = cleanedText.split(timePattern);
    
    if (parts.length > 1) {
      // Reconstruct with proper bullet point formatting
      let reconstructed = parts[0]; // Keep any content before first time period
      for (let i = 1; i < parts.length; i += 2) {
        if (parts[i] && parts[i + 1]) {
          const timePeriod = parts[i].trim();
          const content = parts[i + 1].trim();
          
          // Add bullet point formatting
          reconstructed += `\n- ${timePeriod}: ${content}`;
        }
      }
      cleanedText = reconstructed;
    }
    
    // Split text by lines and process each line
    return cleanedText.split('\n').map((line, lineIdx) => {
      if (line.trim() === '') return <div key={lineIdx} className="h-2" />;
      
      // Check for recommendation markers - support saved, friend, and web recs
      const savedRecMatch = line.match(/\[(?:FRIEND_REC|SAVED_REC):([^:\]]+)(?::([^\]]+))?\]/g);
      const webRecMatch = line.match(/\[WEB_REC:([^:\]]+):([^\]]+)\]/g);
      
      if (savedRecMatch || webRecMatch) {
        let processedLine = line;
        const venues: string[] = [];
        const webVenues: string[] = [];
        
        // Process saved recommendations
        if (savedRecMatch) {
          savedRecMatch.forEach(match => {
            const parts = match.match(/\[(?:FRIEND_REC|SAVED_REC):([^:\]]+)(?::([^\]]+))?\]/);
            if (parts) {
              const venueName = parts[1];
              venues.push(venueName);
              processedLine = processedLine.replace(match, `<VENUE:${venueName}>`);
            }
          });
        }
        
        // Process web recommendations
        if (webRecMatch) {
          webRecMatch.forEach(match => {
            const parts = match.match(/\[WEB_REC:([^:\]]+):([^\]]+)\]/);
            if (parts) {
              const venueName = parts[1];
              webVenues.push(venueName);
              processedLine = processedLine.replace(match, `<WEB_VENUE:${venueName}>`);
            }
          });
        }
        
        // Split by all venue markers and render with interactive elements
        const parts = processedLine.split(/<(?:VENUE|WEB_VENUE):([^>]+)>/);
        
        return (
          <div key={lineIdx} className="mb-2">
            {parts.map((part, partIdx) => {
              const savedVenueName = venues.find(v => part === v);
              const webVenueName = webVenues.find(v => part === v);
              
              if (savedVenueName && friendRecommendations[savedVenueName]) {
                const recommendations = friendRecommendations[savedVenueName];
                
                return (
                  <span key={partIdx} className="inline-block relative">
                    <span 
                      className="text-primary hover:text-primary/80 cursor-pointer font-medium underline decoration-primary/50 hover:decoration-primary transition-colors"
                      onClick={() => setSelectedVenue(savedVenueName)}
                    >
                      {savedVenueName}
                    </span>
                    <span 
                      className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full ml-1 cursor-pointer hover:bg-primary/80 transition-colors"
                      onClick={() => setSelectedVenue(savedVenueName)}
                    >
                      +{recommendations.length}
                    </span>
                  </span>
                );
              }
              
              if (webVenueName && webRecommendations[webVenueName]) {
                const recommendations = webRecommendations[webVenueName];
                
                return (
                  <span key={partIdx} className="inline-block relative">
                    <span 
                      className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium underline decoration-blue-300 hover:decoration-blue-600 transition-colors"
                      onClick={() => setSelectedWebVenue(webVenueName)}
                    >
                      {webVenueName}
                    </span>
                    <span 
                      className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full ml-1 cursor-pointer hover:bg-blue-500 transition-colors"
                      onClick={() => setSelectedWebVenue(webVenueName)}
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
      } else if (line.startsWith('- ')) {
        // Check if this is a time-of-day bullet point and standardize formatting
        const timePattern = /^- (Morning|Afternoon|Evening|Night):/i;
        if (timePattern.test(line)) {
          return <p key={lineIdx} className="text-sm text-muted-foreground mb-1 ml-4">{line.substring(2)}</p>;
        }
        return <p key={lineIdx} className="text-sm text-muted-foreground mb-1 ml-4">{line.substring(2)}</p>;
      } else if (/^(Morning|Afternoon|Evening|Night):/i.test(line.trim())) {
        // Handle time-of-day headers that aren't bullet points
        return <p key={lineIdx} className="text-sm font-medium text-muted-foreground mb-2 mt-3">{line.trim()}</p>;
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
      
      {selectedWebVenue && webRecommendations[selectedWebVenue] && (
        <WebRecommendationModal
          isOpen={!!selectedWebVenue}
          onClose={() => setSelectedWebVenue(null)}
          venueName={selectedWebVenue}
          recommendations={webRecommendations[selectedWebVenue]}
        />
      )}
    </>
  );
};

export default InteractiveIter;