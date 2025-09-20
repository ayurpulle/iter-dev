interface WebRecommendation {
  name: string;
  source: string;
  url: string;
}

export const extractWebRecommendations = (itinerary: string): { [key: string]: WebRecommendation[] } => {
  const webRecommendations: { [key: string]: WebRecommendation[] } = {};
  
  // Find all [WEB_REC:venue_name:source_url] markers
  const webRecMatches = itinerary.match(/\[WEB_REC:([^:\]]+):([^\]]+)\]/g);
  
  if (webRecMatches) {
    webRecMatches.forEach(match => {
      const parts = match.match(/\[WEB_REC:([^:\]]+):([^\]]+)\]/);
      if (parts && parts.length === 3) {
        const venueName = parts[1].trim();
        const sourceUrl = parts[2].trim();
        
        // Extract source name from URL
        let sourceName = 'Web Source';
        try {
          const url = new URL(sourceUrl);
          sourceName = url.hostname.replace('www.', '').replace('.com', '').replace('.co.uk', '');
          sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
        } catch (e) {
          // Keep default source name if URL parsing fails
        }
        
        if (!webRecommendations[venueName]) {
          webRecommendations[venueName] = [];
        }
        
        webRecommendations[venueName].push({
          name: venueName,
          source: sourceName,
          url: sourceUrl
        });
      }
    });
  }
  
  return webRecommendations;
};
