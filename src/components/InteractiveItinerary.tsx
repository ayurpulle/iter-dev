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
    
    // Normalize bullet points to •
    cleanedText = cleanedText
      .replace(/^[\s]*[•\-]\s*/gm, '• ') // Normalize bullets
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .trim();
    
    // Helper function to parse markdown links and recommendations inline
    const parseInlineContent = (content: string) => {
      const elements: JSX.Element[] = [];
      let currentText = '';
      let idx = 0;
      
      // Combined pattern for markdown links and recommendations
      const pattern = /\[([^\]]+)\]\(([^\)]+)\)|\[(?:FRIEND_REC|SAVED_REC|WEB_REC):([^\]]+)\]/g;
      let match;
      let lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          const textBefore = content.substring(lastIndex, match.index);
          if (textBefore) {
            elements.push(<span key={`text-${idx++}`}>{textBefore}</span>);
          }
        }
        
        // Check if it's a markdown link
        if (match[1] && match[2]) {
          // Markdown link [text](url)
          elements.push(
            <a
              key={`link-${idx++}`}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {match[1]}
            </a>
          );
        } else if (match[3]) {
          // Recommendation marker
          const recData = match[3].split(':');
          const venueName = recData[0];
          const recType = match[0].includes('WEB_REC') ? 'web' : 'friend';
          
          if (recType === 'friend' && friendRecommendations[venueName]) {
            const recommendations = friendRecommendations[venueName];
            elements.push(
              <span key={`rec-${idx++}`} className="inline-block relative">
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
          } else if (recType === 'web' && webRecommendations[venueName]) {
            const recommendations = webRecommendations[venueName];
            elements.push(
              <span key={`web-rec-${idx++}`} className="inline-block relative">
                <span 
                  className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium underline decoration-blue-300 hover:decoration-blue-600 transition-colors"
                  onClick={() => setSelectedWebVenue(venueName)}
                >
                  {venueName}
                </span>
                <span 
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full ml-1 cursor-pointer hover:bg-blue-500 transition-colors"
                  onClick={() => setSelectedWebVenue(venueName)}
                >
                  +{recommendations.length}
                </span>
              </span>
            );
          }
        }
        
        lastIndex = pattern.lastIndex;
      }
      
      // Add remaining text
      if (lastIndex < content.length) {
        const textAfter = content.substring(lastIndex);
        if (textAfter) {
          elements.push(<span key={`text-${idx++}`}>{textAfter}</span>);
        }
      }
      
      return elements.length > 0 ? elements : content;
    };
    
    // Split text by lines and process each line
    return cleanedText.split('\n').map((line, lineIdx) => {
      if (line.trim() === '') return <div key={lineIdx} className="h-2" />;
      
      // Parse inline content (links and recommendations)
      const content = parseInlineContent(line);
      
      // Regular line formatting with parsed content
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-xl font-bold mb-3 text-foreground">{parseInlineContent(line.substring(2))}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-lg font-semibold mb-2 text-foreground">{parseInlineContent(line.substring(3))}</h2>;
      } else if (line.startsWith('• ') || line.startsWith('- ')) {
        // Standardize bullet points
        const lineContent = line.startsWith('• ') ? line.substring(2) : line.substring(2);
        
        // Check if this is a time-of-day bullet point with special formatting
        const timePattern = /^(Morning|Afternoon|Evening|Night):\s*(.*)$/i;
        const timeMatch = lineContent.match(timePattern);
        
        if (timeMatch) {
          const timePeriod = timeMatch[1];
          const rest = timeMatch[2];
          return (
            <p key={lineIdx} className="text-sm mb-2 ml-4">
              <span className="font-semibold text-foreground">{timePeriod}:</span>{' '}
              <span className="text-muted-foreground">{parseInlineContent(rest)}</span>
            </p>
          );
        }
        return <p key={lineIdx} className="text-sm text-muted-foreground mb-1 ml-4">• {content}</p>;
      } else if (/^(Morning|Afternoon|Evening|Night):/i.test(line.trim())) {
        // Handle time-of-day headers that aren't bullet points
        const timePattern = /^(Morning|Afternoon|Evening|Night):\s*(.*)$/i;
        const timeMatch = line.trim().match(timePattern);
        
        if (timeMatch) {
          const timePeriod = timeMatch[1];
          const rest = timeMatch[2];
          return (
            <p key={lineIdx} className="text-sm mb-2 mt-3">
              <span className="font-semibold text-foreground">{timePeriod}:</span>{' '}
              <span className="text-muted-foreground">{parseInlineContent(rest)}</span>
            </p>
          );
        }
      }
      
      // Default paragraph
      return <p key={lineIdx} className="text-sm text-foreground mb-2">{content}</p>;
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