import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  content: string;
  contentType?: 'post' | 'comment' | 'bio' | 'message';
}

interface ModerationResponse {
  isAppropriate: boolean;
  reason?: string;
  flaggedCategories?: string[];
  severity?: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { content, contentType = 'post' }: ModerationRequest = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Moderating ${contentType} content: ${content.substring(0, 100)}...`);

    // Use OpenAI's moderation endpoint
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
      }),
    });

    if (!moderationResponse.ok) {
      console.error('OpenAI moderation API error:', moderationResponse.status);
      return new Response(JSON.stringify({ error: 'Moderation service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    console.log('Moderation result:', JSON.stringify(result, null, 2));

    // Determine if content is appropriate
    const isAppropriate = !result.flagged;
    const flaggedCategories: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (result.flagged) {
      // Check which categories were flagged
      const categories = result.categories;
      const categoryScores = result.category_scores;

      for (const [category, flagged] of Object.entries(categories)) {
        if (flagged) {
          flaggedCategories.push(category);
          
          // Determine severity based on scores
          const score = categoryScores[category] as number;
          if (score > 0.8) {
            severity = 'high';
          } else if (score > 0.5) {
            severity = 'medium';
          }
        }
      }
    }

    // Additional custom checks for travel-specific inappropriate content
    const customChecks = performCustomChecks(content);
    const finalResult: ModerationResponse = {
      isAppropriate: isAppropriate && customChecks.isAppropriate,
      reason: !isAppropriate ? 'Content violates community guidelines' : customChecks.reason,
      flaggedCategories: [...flaggedCategories, ...customChecks.flaggedCategories],
      severity: severity,
    };

    console.log('Final moderation result:', finalResult);

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in moderate-content function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Custom checks for travel-specific content
function performCustomChecks(content: string): {
  isAppropriate: boolean;
  reason?: string;
  flaggedCategories: string[];
} {
  const lowerContent = content.toLowerCase();
  
  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /(https?:\/\/[^\s]+){3,}/, // Multiple URLs
    /(\b\w+\b.*?){50,}/, // Excessive repetition
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      return {
        isAppropriate: false,
        reason: 'Content appears to be spam',
        flaggedCategories: ['spam'],
      };
    }
  }

  // Check for inappropriate location sharing (safety)
  const unsafeLocationPatterns = [
    /\bhome\s+address\b/i,
    /\bpersonal\s+address\b/i,
    /\bexact\s+location\b/i,
  ];

  for (const pattern of unsafeLocationPatterns) {
    if (pattern.test(content)) {
      return {
        isAppropriate: false,
        reason: 'Avoid sharing exact personal locations for safety',
        flaggedCategories: ['unsafe_location_sharing'],
      };
    }
  }

  // Check for potential scams
  const scamPatterns = [
    /\bfree\s+money\b/i,
    /\bget\s+rich\s+quick\b/i,
    /\bclick\s+here\s+to\s+earn\b/i,
    /\btoo\s+good\s+to\s+be\s+true\b/i,
  ];

  for (const pattern of scamPatterns) {
    if (pattern.test(content)) {
      return {
        isAppropriate: false,
        reason: 'Content may contain misleading information',
        flaggedCategories: ['potential_scam'],
      };
    }
  }

  return {
    isAppropriate: true,
    flaggedCategories: [],
  };
}