interface FabricRecommendation {
  title: string;
  url: string;
  content?: string;
  tags?: string[];
  source?: string;
}

/**
 * Formats Fabric recommendations into a RAG context string for itinerary generation
 */
export const formatFabricContextForRAG = (
  recommendations: FabricRecommendation[],
  destination: string
): string => {
  if (!recommendations || recommendations.length === 0) {
    return '';
  }

  let context = `\n\n## Fabric MCP Context for ${destination}\n\n`;
  context += `The user has ${recommendations.length} saved recommendations from their Fabric knowledge base:\n\n`;

  recommendations.forEach((rec, index) => {
    context += `### Fabric Recommendation ${index + 1}: ${rec.title}\n`;
    if (rec.source) {
      context += `Source: ${rec.source}\n`;
    }
    if (rec.url) {
      context += `URL: ${rec.url}\n`;
    }
    if (rec.tags && rec.tags.length > 0) {
      context += `Tags: ${rec.tags.join(', ')}\n`;
    }
    if (rec.content) {
      // Truncate content to 300 chars to keep context manageable
      const truncated = rec.content.length > 300 
        ? rec.content.substring(0, 300) + '...' 
        : rec.content;
      context += `Content: ${truncated}\n`;
    }
    context += `\n`;
  });

  context += `\nPlease incorporate relevant information from these Fabric recommendations into the itinerary where appropriate. `;
  context += `When you reference content from Fabric, include [FABRIC_REC:title:url] markers so we can link back to the source.\n`;

  return context;
};

/**
 * Extracts Fabric recommendation markers from itinerary text
 */
export const extractFabricRecommendations = (itinerary: string): { [key: string]: { url: string }[] } => {
  const fabricRecs: { [key: string]: { url: string }[] } = {};
  
  // Find all [FABRIC_REC:title:url] markers
  const fabricMatches = itinerary.match(/\[FABRIC_REC:([^:\]]+):([^\]]+)\]/g);
  
  if (fabricMatches) {
    fabricMatches.forEach(match => {
      const parts = match.match(/\[FABRIC_REC:([^:\]]+):([^\]]+)\]/);
      if (parts && parts.length === 3) {
        const title = parts[1].trim();
        const url = parts[2].trim();
        
        if (!fabricRecs[title]) {
          fabricRecs[title] = [];
        }
        
        fabricRecs[title].push({ url });
      }
    });
  }
  
  return fabricRecs;
};
