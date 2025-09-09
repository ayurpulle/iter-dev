import { useSavedPosts } from "./useSavedPosts";
import { useFriends } from "./useFriends";

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
    
    if (inspirationSource === "folder" && inspirationFolder) {
      // Filter to specific folder posts only - for now we'll skip folder filtering since the schema doesn't include folder names
      // TODO: Add proper folder filtering when folder names are available in the schema
      postsToAnalyze = savedPosts;
    } else if (inspirationSource === "none") {
      // Use minimal posts - only friends' posts about the exact destination
      postsToAnalyze = savedPosts.filter(savedPost => {
        const postContent = savedPost.posts?.content?.toLowerCase() || '';
        const tripTitle = savedPost.posts?.trips?.title?.toLowerCase() || '';
        return locationKeywords.some(keyword => 
          postContent.includes(keyword) || tripTitle.includes(keyword)
        );
      });
    }
    // If "all", use all saved posts (default behavior)

    postsToAnalyze.forEach(savedPost => {
      if (!savedPost.posts?.content || !savedPost.posts.profiles?.name) return;

      const postContent = savedPost.posts.content.toLowerCase();
      const tripTitle = savedPost.posts.trips?.title?.toLowerCase() || '';
      
      // For folder-specific inspiration, prioritize all posts in that folder
      let isRelevant = false;
      if (inspirationSource === "folder" && inspirationFolder) {
        isRelevant = true; // Already filtered above
      } else {
        // Check if post is relevant to the destination
        isRelevant = locationKeywords.some(keyword => 
          postContent.includes(keyword) || tripTitle.includes(keyword)
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

  const generateRAGPrompt = (destination: string, interests?: string[], startDate?: Date, endDate?: Date, budget?: number, inspirationSource?: string, inspirationFolder?: string) => {
    const friendExperiences = findRelevantFriendExperiences(destination, interests, inspirationSource, inspirationFolder);
    const venuesWithFriends = Object.keys(friendExperiences);

    let ragContext = '';
    if (venuesWithFriends.length > 0) {
      const sourceDescription = inspirationSource === "folder" && inspirationFolder 
        ? `from your "${inspirationFolder}" folder` 
        : inspirationSource === "all" 
        ? "from your saved posts collection"
        : "from your friends' experiences";

      ragContext = `\n\nFRIEND RECOMMENDATIONS CONTEXT:
Based on your travel inspiration ${sourceDescription}, here are places they've visited and enjoyed in ${destination}:

${venuesWithFriends.map(venue => {
  const recs = friendExperiences[venue];
  const authorNames = [...new Set(recs.map(rec => rec.name))];
  return `- ${venue}: Recommended by ${authorNames.join(', ')}
    ${recs.map(rec => `  • ${rec.name}: "${rec.review.substring(0, 100)}..."`).join('\n    ')}`;
}).join('\n')}

IMPORTANT: When mentioning any of these venues in your itinerary, add "(suggested by ${
  inspirationSource === "folder" && inspirationFolder 
    ? `your ${inspirationFolder} collection` 
    : "your friends"
})" immediately after the venue name.

For venues from the list above, also add the technical marker [FRIEND_REC:VenueName] after the venue name for display purposes.

Prioritize these recommended places in your itinerary as they come from trusted sources.`;
    }

    return {
      ragContext,
      friendRecommendations: friendExperiences
    };
  };

  return {
    findRelevantFriendExperiences,
    generateRAGPrompt,
    extractVenuesFromText
  };
};