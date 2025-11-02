import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SavedRecommendationModal } from "@/components/SavedRecommendationModal";
import { WebRecommendationModal } from "@/components/WebRecommendationModal";
import { extractFabricRecommendations, type FabricRecommendation } from "@/utils/fabricFormatter";

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
  const [selectedFabricVenue, setSelectedFabricVenue] = useState<string | null>(null);
  
  const fabricRecommendations = extractFabricRecommendations(itinerary);

  const toggleVenue = (venueName: string) => {
    setExpandedVenues(prev => ({
      ...prev,
      [venueName]: !prev[venueName]
    }));
  };

  const renderIterWithRecommendations = (text: string) => {
    // First, ensure time periods are on their own lines
    let cleanedText = text
      // Split inline time periods onto separate lines
      .replace(/\s+(Morning|Afternoon|Evening|Night):/g, '\n$1:')
      // Ensure travel tips sections are on separate lines
      .replace(/\s+(Local Customs?|Transportation|Money|What to Pack|Safety|Best Times? to Visit):/gi, '\n$1:')
      // Ensure subsection titles are on separate lines
      .replace(/\s+(Flight Recommendations?|Booking Tips?|Airport Transfer|Travel Documentation|Accommodation Recommendations?|Budget|Mid-Range|Luxury|Best Neighborhoods?|Booking Tips & Timing|Car Rental):/gi, '\n$1:');
    
    // Clean up markdown formatting but preserve structure
    cleanedText = cleanedText
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove ** markdown formatting
      .replace(/\*([^*]+)\*/g, '$1') // Remove * markdown formatting
      .replace(/\s*[-–—\-]{2,}\s*$/gm, '') // Remove trailing dashes/horizontal rules from lines (2 or more dashes)
      .replace(/^[\s]*[-•]+\s*/gm, '• ') // Convert all dashes and existing bullets to single bullet
      .replace(/•\s*•+/g, '•') // Remove multiple bullets
      .replace(/•\s+•/g, '•') // Remove spaced double bullets
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^[•\s]*[-–—\-]+\s*$/)) // Remove lines that are just bullets and dashes
      .filter(line => !line.match(/^[-–—*_\-]{2,}$/)) // Remove horizontal rule lines (---, ***, ___)
      .filter(line => line !== '•') // Remove lines that are just a single bullet
      .join('\n')
      // Remove newlines within WEB_REC and FABRIC_REC tags to ensure they parse correctly
      .replace(/\[(WEB_REC|FABRIC_REC):[^\]]*\]/gs, (match) => match.replace(/\n/g, ' '));
    
    // Helper function to parse markdown links and recommendations inline
    const parseInlineContent = (content: string) => {
      const elements: JSX.Element[] = [];
      let idx = 0;
      
      // Combined pattern for markdown links and recommendations
      // Handle both [text](url) and [WEB_REC: VenueName:URL] formats
      const pattern = /\[([^\]]+)\]\s*\(\s*([\s\S]+?)\s*\)|\[(?:FRIEND_REC|SAVED_REC):([^\]]+)\]|\[(?:WEB_REC|FABRIC_REC):\s*(.+?):\s*(https?:\/\/[^\]]+)\]|\[(?:WEB_REC|FABRIC_REC):([^\]]+)\]/g;
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
          // Markdown link [text](url) - clean up URL by removing spaces
          const cleanUrl = match[2].trim().replace(/\s+/g, '');
          const linkText = match[1].trim();
          
          elements.push(
            <a
              key={`link-${idx++}`}
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline font-medium transition-colors"
            >
              {linkText}
            </a>
          );
        } else if (match[4] && match[5]) {
          // WEB_REC or FABRIC_REC with inline URL: [WEB_REC: VenueName:URL]
          const venueName = match[4].trim();
          const url = match[5].trim();
          const isFabric = match[0].includes('FABRIC_REC');
          
          // Check if we have recommendations data for this venue - if so, show bubble modal
          if (isFabric && fabricRecommendations[venueName]) {
            const recommendations = fabricRecommendations[venueName];
            elements.push(
              <span key={`fabric-rec-${idx++}`} className="inline-block relative">
                <span 
                  className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium underline decoration-pink-300 hover:decoration-pink-600 transition-colors"
                  onClick={() => setSelectedFabricVenue(venueName)}
                >
                  {venueName}
                </span>
                <span 
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-full ml-1 cursor-pointer hover:from-pink-500 hover:to-purple-500 transition-colors"
                  onClick={() => setSelectedFabricVenue(venueName)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </span>
              </span>
            );
          } else if (!isFabric && webRecommendations[venueName]) {
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
          } else {
            // No recommendations data, just show as hyperlink
            elements.push(
              <a
                key={`inline-rec-${idx++}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={isFabric 
                  ? "text-pink-600 hover:text-pink-500 underline font-medium transition-colors"
                  : "text-blue-600 hover:text-blue-500 underline font-medium transition-colors"
                }
              >
                {venueName}
              </a>
            );
          }
        } else if (match[3] || match[6]) {
          // Recommendation marker without URL
          const recData = (match[3] || match[6]).split(':');
          const venueName = recData[0];
          const recType = match[0].includes('WEB_REC') 
            ? 'web' 
            : match[0].includes('FABRIC_REC') 
              ? 'fabric' 
              : 'friend';
          
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
          } else if (recType === 'fabric' && fabricRecommendations[venueName]) {
            // Handle Fabric recommendations - make them clickable
            const recommendations = fabricRecommendations[venueName];
            elements.push(
              <span key={`fabric-rec-${idx++}`} className="inline-block relative">
                <span 
                  className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium underline decoration-pink-300 hover:decoration-pink-600 transition-colors"
                  onClick={() => setSelectedFabricVenue(venueName)}
                >
                  {venueName}
                </span>
                <span 
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-full ml-1 cursor-pointer hover:from-pink-500 hover:to-purple-500 transition-colors"
                  onClick={() => setSelectedFabricVenue(venueName)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
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
      if (line.trim() === '') return null;
      
      // Parse inline content (links and recommendations)
      const content = parseInlineContent(line);
      
      // Regular line formatting with parsed content
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-2xl font-bold mb-1 mt-2 text-foreground">{parseInlineContent(line.substring(2))}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-xl font-bold mb-1 mt-1 text-foreground">{parseInlineContent(line.substring(3))}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={lineIdx} className="text-lg font-bold mb-0.5 mt-1 text-foreground">{parseInlineContent(line.substring(4))}</h3>;
      } else if (line.startsWith('• ') || line.startsWith('- ')) {
        // Standardize bullet points - strip the bullet, we'll add it back cleanly
        const lineContent = line.replace(/^[•\-]\s+/, '').trim();
        
        // Check if this is a time-of-day bullet point with special formatting
        // Use word boundary to avoid matching words like "nightcap"
        const timePattern = /^(Morning|Afternoon|Evening|Night):\s*(.*)$/i;
        const timeMatch = lineContent.match(timePattern);
        
        if (timeMatch) {
          const timePeriod = timeMatch[1];
          const rest = timeMatch[2];
          return (
            <div key={lineIdx} className="mb-1 mt-2">
              <div className="font-bold text-base text-foreground">{timePeriod}:</div>
              {rest && rest.trim() !== '' && <div className="text-sm text-foreground ml-4 mt-1 break-words leading-relaxed">{parseInlineContent(rest)}</div>}
            </div>
          );
        }
        
        // Check for travel tips section titles (Local Customs, Transportation, Money, What to Pack, Safety, Best Times to Visit)
        const travelTipsPattern = /^(Local Customs?|Transportation|Money|What to Pack|Safety|Best Times? to Visit)(?:\s*&\s*[\w\s]+)?:?\s*(.*)$/i;
        const travelTipsMatch = lineContent.match(travelTipsPattern);
        
        if (travelTipsMatch) {
          const title = travelTipsMatch[1];
          const description = travelTipsMatch[2];
          return (
            <div key={lineIdx} className="mb-1 mt-2">
              <div className="font-bold text-sm text-foreground">{title}:</div>
              {description && description.trim() !== '' && <div className="text-sm text-foreground ml-4 mt-0.5 break-words leading-relaxed">{parseInlineContent(description)}</div>}
            </div>
          );
        }
        
        // Check for subsection titles in Getting There, Perfect Stay, etc.
        const subsectionPattern = /^(Flight Recommendations?|Booking Tips?|Airport Transfer|Travel Documentation|Accommodation Recommendations?|Budget|Mid-Range|Luxury|Best Neighborhoods?|Booking Tips & Timing|Car Rental)(?:\s*&\s*[\w\s]+)?:?\s*(.*)$/i;
        const subsectionMatch = lineContent.match(subsectionPattern);
        
        if (subsectionMatch) {
          const title = subsectionMatch[1];
          const description = subsectionMatch[2];
          return (
            <div key={lineIdx} className="mb-1 mt-2">
              <div className="font-bold text-sm text-foreground">{title}:</div>
              {description && description.trim() !== '' && <div className="text-sm text-foreground ml-4 mt-0.5 break-words leading-relaxed">{parseInlineContent(description)}</div>}
            </div>
          );
        }
        
        // Check for other bolded section titles (shorter ones)
        const sectionPattern = /^([^:]+):\s*(.*)$/;
        const sectionMatch = lineContent.match(sectionPattern);
        
        if (sectionMatch && sectionMatch[1].length < 40 && !sectionMatch[1].includes('•')) {
          const title = sectionMatch[1];
          const description = sectionMatch[2];
          return (
            <div key={lineIdx} className="mb-1">
              <span className="font-bold text-sm text-foreground">{title}:</span>
              {description && description.trim() !== '' && <span className="text-sm text-foreground ml-1 break-words">{parseInlineContent(description)}</span>}
            </div>
          );
        }
        
        // Regular bullet point - render with single bullet
        return <div key={lineIdx} className="flex items-start gap-2 text-sm text-foreground mb-1 leading-relaxed"><span className="mt-0.5">•</span><span className="flex-1 break-words">{parseInlineContent(lineContent)}</span></div>;
      } else if (/^(Morning|Afternoon|Evening|Night):\s*/i.test(line.trim())) {
        // Handle time-of-day headers that aren't bullet points
        // Require colon to avoid matching words like "nightcap"
        const timePattern = /^(Morning|Afternoon|Evening|Night):\s*(.*)$/i;
        const timeMatch = line.trim().match(timePattern);
        
        if (timeMatch) {
          const timePeriod = timeMatch[1];
          const rest = timeMatch[2];
          return (
            <div key={lineIdx} className="mb-1 mt-2">
              <div className="font-bold text-base text-foreground">{timePeriod}:</div>
              {rest && rest.trim() !== '' && <div className="text-sm text-foreground ml-4 mt-1 break-words leading-relaxed">{parseInlineContent(rest)}</div>}
            </div>
          );
        }
      }
      
      // Default paragraph
      return <p key={lineIdx} className="text-sm text-foreground mb-1 leading-relaxed">{content}</p>;
    });
  };

  return (
    <>
      <div className="prose prose-sm max-w-none text-foreground overflow-hidden break-words">
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
      
      {selectedFabricVenue && fabricRecommendations[selectedFabricVenue] && (
        <SavedRecommendationModal
          isOpen={!!selectedFabricVenue}
          onClose={() => setSelectedFabricVenue(null)}
          venueName={selectedFabricVenue}
          fabricRecommendations={fabricRecommendations[selectedFabricVenue]}
        />
      )}
    </>
  );
};

export default InteractiveIter;