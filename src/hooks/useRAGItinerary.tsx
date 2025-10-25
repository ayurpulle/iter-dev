import { useSavedPosts } from "./useSavedPosts";
import { useFriends } from "./useFriends";
import { useFabricRecommendations } from "./useFabricRecommendations";
import { formatFabricContextForRAG } from "@/utils/fabricFormatter";

export interface FriendRecommendation {
  name: string;
  avatar?: string;
  review: string;
  rating?: number;
  visitDate?: string;
  postId: string;
}

export const useRAGIter = () => {
  const { savedPosts } = useSavedPosts();
  const { friends } = useFriends();
  const { isConnected: isFabricConnected, fetchRecommendations: fetchFabricRecs } = useFabricRecommendations();

  const extractLocationKeywords = (destination: string): string[] => {
    // Extract common location keywords that might match with posts
    const words = destination.toLowerCase().split(/[\s,]+/);
    return words.filter(word => word.length > 2);
  };

  const extractVenuesFromText = (text: string): string[] => {
    // Extract potential venue names from post content
    const venues: string[] = [];
    const commonVenueWords = [
      'hotel', 'restaurant', 'bar', 'cafe', 'museum', 'gallery', 'park', 
      'beach', 'market', 'church', 'temple', 'palace', 'castle', 'tower',
      'square', 'plaza', 'garden', 'bridge', 'spa', 'club', 'pub', 'bistro'
    ];
    
    // Look for venue patterns like "stayed at X", "ate at X", "visited X"
    const patterns = [
      /(?:stayed|stay|staying) (?:at|in) ([^,.!?]+)/gi,
      /(?:ate|eating|dined|dining) (?:at|in) ([^,.!?]+)/gi,
      /(?:visited|visit|visiting) (?:the )?([^,.!?]+)/gi,
      /(?:went|go|going) to (?:the )?([^,.!?]+)/gi,
      /(?:loved|love|amazing|beautiful|incredible) ([^,.!?]+)/gi,
      /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g // Proper nouns (likely venue names)
    ];

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const venue = match[1]?.trim();
        if (venue && venue.length > 3 && venue.length < 50) {
          venues.push(venue);
        }
      }
    });

    return [...new Set(venues)]; // Remove duplicates
  };

  const findRelevantFriendExperiences = (destination: string, interests?: string[], inspirationSource?: string, inspirationFolder?: string) => {
    const locationKeywords = extractLocationKeywords(destination);
    const friendRecommendations: { [venue: string]: FriendRecommendation[] } = {};

    // Filter posts based on inspiration source
    let postsToAnalyze = savedPosts;
    
    if (inspirationSource === "folder" && inspirationFolder && inspirationFolder !== "all-folders") {
      // Filter to specific folder posts only
      postsToAnalyze = savedPosts.filter(savedPost => savedPost.folder_id === inspirationFolder);
    } else if (inspirationSource === "none") {
      // Use minimal posts - only friends' posts about the exact destination
      postsToAnalyze = savedPosts.filter(savedPost => {
        const postContent = savedPost.posts?.content?.toLowerCase() || '';
        const tripTitle = savedPost.posts?.trips?.title?.toLowerCase() || '';
        const tripStops = savedPost.posts?.trips?.stops || [];
        return locationKeywords.some(keyword => 
          postContent.includes(keyword) || 
          tripTitle.includes(keyword) ||
          tripStops.some((stop: any) => stop.name?.toLowerCase().includes(keyword))
        );
      });
    }
    // If "all", use all saved posts (default behavior)

    postsToAnalyze.forEach(savedPost => {
      if (!savedPost.posts?.content || !savedPost.posts.profiles?.name) return;

      const postContent = savedPost.posts.content.toLowerCase();
      const tripTitle = savedPost.posts.trips?.title?.toLowerCase() || '';
      const tripStops = savedPost.posts.trips?.stops || [];
      
      // For folder-specific inspiration, prioritize all posts in that folder
      let isRelevant = false;
      if (inspirationSource === "folder" && inspirationFolder) {
        isRelevant = true; // Already filtered above
      } else {
        // Check if post is relevant to the destination using multiple location sources
        isRelevant = locationKeywords.some(keyword => 
          postContent.includes(keyword) || 
          tripTitle.includes(keyword) ||
          tripStops.some((stop: any) => stop.name?.toLowerCase().includes(keyword))
        );

        if (!isRelevant && interests) {
          // Also check if post matches interests
          const matchesInterests = interests.some(interest => 
            postContent.includes(interest.toLowerCase())
          );
          if (matchesInterests) isRelevant = true;
        }
      }

      if (!isRelevant) return;

      // Extract venues from this post
      const venues = extractVenuesFromText(savedPost.posts.content);
      
      venues.forEach(venue => {
        if (!friendRecommendations[venue]) {
          friendRecommendations[venue] = [];
        }

        // Create recommendation from this post
        const recommendation: FriendRecommendation = {
          name: savedPost.posts!.profiles!.name!,
          avatar: savedPost.posts!.profiles!.avatar,
          review: savedPost.posts!.content!.substring(0, 150) + (savedPost.posts!.content!.length > 150 ? '...' : ''),
          visitDate: new Date(savedPost.posts!.created_at).toLocaleDateString(),
          postId: savedPost.posts!.id
        };

        // Try to extract rating from content
        const ratingMatch = savedPost.posts!.content.match(/(\d+)\/5|(\d+)\s*stars?|⭐{1,5}/i);
        if (ratingMatch) {
          if (ratingMatch[1]) recommendation.rating = parseInt(ratingMatch[1]);
          else if (ratingMatch[2]) recommendation.rating = parseInt(ratingMatch[2]);
        }

        friendRecommendations[venue].push(recommendation);
      });
    });

    return friendRecommendations;
  };

  const detectDestinationContext = (destination: string, startDate?: Date) => {
    const destLower = destination.toLowerCase();
    const month = startDate ? startDate.getMonth() + 1 : null; // 1-12
    
    // Ski destinations in winter months
    const skiDestinations = ['les arcs', 'val thorens', 'chamonix', 'verbier', 'zermatt', 'st. moritz', 'aspen', 'whistler', 'vail'];
    const isWinterMonth = month && (month >= 12 || month <= 3);
    
    if (skiDestinations.some(ski => destLower.includes(ski)) && isWinterMonth) {
      return { activity: 'skiing', season: 'winter' };
    }
    
    // Beach destinations in summer
    const beachDestinations = ['maldives', 'santorini', 'mykonos', 'ibiza', 'bali', 'hawaii', 'miami', 'nice', 'cannes'];
    const isSummerMonth = month && month >= 6 && month <= 8;
    
    if (beachDestinations.some(beach => destLower.includes(beach)) && isSummerMonth) {
      return { activity: 'beach', season: 'summer' };
    }
    
    return { activity: null, season: null };
  };

  const generateRAGPrompt = async (destination: string, interests?: string[], startDate?: Date, endDate?: Date, budget?: number, inspirationSource?: string, inspirationFolder?: string, folderName?: string) => {
    const friendExperiences = findRelevantFriendExperiences(destination, interests, inspirationSource, inspirationFolder);
    const venuesWithFriends = Object.keys(friendExperiences);
    const { activity, season } = detectDestinationContext(destination, startDate);

    // Fetch Fabric recommendations if connected
    let fabricContext = '';
    if (isFabricConnected) {
      try {
        const fabricRecs = await fetchFabricRecs(destination, interests);
        fabricContext = formatFabricContextForRAG(fabricRecs, destination);
      } catch (error) {
        console.error('Error fetching Fabric recommendations:', error);
        // Continue without Fabric context
      }
    }

    let ragContext = '';
    if (venuesWithFriends.length > 0) {
      const sourceDescription = inspirationSource === "folder" && folderName 
        ? `from your "${folderName}" folder` 
        : inspirationSource === "all"
        ? "from your saved posts collection"
        : "from your friends' experiences";

      ragContext = `\n\nSAVED RECOMMENDATIONS CONTEXT:
Based on your travel inspiration ${sourceDescription}, here are places they've visited and enjoyed in ${destination}:

${venuesWithFriends.map(venue => {
  const recs = friendExperiences[venue];
  const authorNames = [...new Set(recs.map(rec => rec.name))];
  return `- ${venue}: Recommended by ${authorNames.join(', ')}
    ${recs.map(rec => `  • ${rec.name}: "${rec.review.substring(0, 100)}..."`).join('\n    ')}`;
}).join('\n')}

IMPORTANT: When mentioning any of these venues in your itinerary, add the marker [SAVED_REC:VenueName:UserName] immediately after the venue name.

${activity ? `\nCONTEXT: Since this is ${destination} in ${season || 'the selected time'}, focus heavily on ${activity} activities and related recommendations.` : ''}

Also include 1-2 internet-researched recommendations per itinerary with high ratings/reviews, marked as [WEB_REC:VenueName:source_url] for display purposes.

Prioritize these recommended places in your itinerary as they come from trusted sources.`;
    } else if (activity) {
      ragContext = `\n\nCONTEXT: Since this is ${destination} in ${season || 'the selected time'}, focus heavily on ${activity} activities and related recommendations.

Include 1-2 internet-researched recommendations with high ratings/reviews, marked as [WEB_REC:VenueName:source_url] for display purposes.`;
    }

    // Append Fabric context if available
    if (fabricContext) {
      ragContext += fabricContext;
    }

    return {
      ragContext,
      friendRecommendations: friendExperiences
    };
  };

  return {
    findRelevantFriendExperiences,
    generateRAGPrompt,
    extractVenuesFromText,
    isFabricConnected
  };
};