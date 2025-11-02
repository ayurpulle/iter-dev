import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface RegenerateItineraryData {
  itineraryId: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  interests?: string;
  travelStyle?: string;
  ragContext?: string;
  friendRecommendations?: any;
  currentContent: string;
}

async function regenerateItineraryBackground(requestData: RegenerateItineraryData, authHeader: string, userId: string) {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user profile for currency and base location
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_currency, base_location')
      .eq('user_id', userId)
      .single();

    const userCurrency = profile?.default_currency || 'USD';
    const userLocation = profile?.base_location || 'United States';

    // Fetch personalized Fabric data from both API and local tables
    let fabricContext = '';
    const fabricKeywords: { search: string[], instagram: string[] } = { search: [], instagram: [] };
    
    try {
      const { data: fabricConnection } = await supabase
        .from('fabric_connections')
        .select('access_token, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (fabricConnection?.access_token) {
        // Fetch API recommendations
        const interestsArray = typeof requestData.interests === 'string' 
          ? requestData.interests.split(',').map((i: string) => i.trim()) 
          : Array.isArray(requestData.interests) 
            ? requestData.interests 
            : [];

        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/fetch-fabric-recommendations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              destination: requestData.destination,
              interests: interestsArray,
              accessToken: fabricConnection.access_token
            })
          });

          if (response.ok) {
            const fabricRecs = await response.json();
            if (Array.isArray(fabricRecs) && fabricRecs.length > 0) {
              fabricContext = `\n\nFABRIC API RECOMMENDATIONS:\n${
                fabricRecs.map((rec: any) => 
                  `- ${rec.title}${rec.url ? ` (${rec.url})` : ''}${rec.content ? `: ${rec.content}` : ''}`
                ).join('\n')
              }\n`;
            }
          }
        } catch (apiErr) {
          console.error('Failed to fetch Fabric API recommendations:', apiErr);
        }
      }
    } catch (fabricErr) {
      console.error('Failed to fetch Fabric connection:', fabricErr);
    }

    // Query local Google Search and Instagram data (always, not just with Fabric connection)
    try {
      const destinationKeywords = requestData.destination.toLowerCase().split(/[\s,]+/);
      
      // Query Google Search summaries for rich context
      const { data: searchSummaries } = await supabase
        .from('google_search_summaries')
        .select('summary_content, summary_date, metadata')
        .eq('user_id', userId)
        .order('summary_date', { ascending: false })
        .limit(8);

      const { data: searchData } = await supabase
        .from('google_search_raw_threads')
        .select('content, preview, details, asat')
        .eq('user_id', userId)
        .order('asat', { ascending: false })
        .limit(50);

      const { data: instagramData } = await supabase
        .from('instagram_interactions')
        .select('content, preview, details')
        .eq('user_id', userId)
        .order('asat', { ascending: false })
        .limit(30);

      // Filter for destination-relevant content and extract keywords
      const relevantSearches = searchData?.filter(item => {
        const searchText = (item.content || item.preview || '').toLowerCase();
        return destinationKeywords.some(keyword => 
          searchText.includes(keyword) || 
          searchText.includes('travel') || 
          searchText.includes('hotel') || 
          searchText.includes('flight') ||
          searchText.includes('restaurant') ||
          searchText.includes('things to do')
        );
      }) || [];

      const relevantInstagram = instagramData?.filter(item => {
        const postText = (item.content || item.preview || '').toLowerCase();
        return destinationKeywords.some(keyword => postText.includes(keyword));
      }) || [];

      // Extract specific keywords/venues from searches
      relevantSearches.forEach(search => {
        const text = search.preview || search.content || '';
        const venueMatches = text.match(/(?:restaurant|hotel|cafe|bar|museum|beach|park|market|temple|church|palace|tower|arena|stadium|theater)\s+[\w\s]+|[\w\s]+(?:restaurant|hotel|cafe|bar|museum|beach|park|market|temple|church|palace|tower|arena|stadium|theater)/gi);
        if (venueMatches) {
          venueMatches.forEach(match => {
            const cleaned = match.trim().slice(0, 50);
            if (!fabricKeywords.search.includes(cleaned)) {
              fabricKeywords.search.push(cleaned);
            }
          });
        }
        const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
        words.slice(0, 5).forEach(word => {
          if (!fabricKeywords.search.includes(word) && 
              !['travel', 'hotel', 'flight', 'restaurant', 'things', 'search'].includes(word)) {
            fabricKeywords.search.push(word);
          }
        });
      });

      // Extract specific venues/topics from Instagram
      relevantInstagram.forEach(post => {
        const text = post.preview || post.content || '';
        const venueMatches = text.match(/(?:@[\w.]+|#[\w]+|[\w\s]+(?:restaurant|hotel|cafe|bar|museum|beach|park))/gi);
        if (venueMatches) {
          venueMatches.forEach(match => {
            const cleaned = match.trim().slice(0, 50);
            if (!fabricKeywords.instagram.includes(cleaned)) {
              fabricKeywords.instagram.push(cleaned);
            }
          });
        }
      });

      // Add local data to context
      if (searchSummaries && searchSummaries.length > 0) {
        fabricContext += '\n\nYOUR INTERESTS & PREFERENCES (from your digital activity):\n';
        searchSummaries.forEach(summary => {
          fabricContext += `\n${summary.summary_content}\n`;
        });
      }

      if (relevantSearches.length > 0 || relevantInstagram.length > 0) {
        fabricContext += '\n\nRECENT RELEVANT ACTIVITY:\n';
        
        if (relevantSearches.length > 0) {
          fabricContext += '\nRecent Searches:\n';
          relevantSearches.slice(0, 10).forEach(search => {
            fabricContext += `- ${search.preview || search.content}\n`;
          });
        }

        if (relevantInstagram.length > 0) {
          fabricContext += '\nInstagram Activity:\n';
          relevantInstagram.slice(0, 5).forEach(post => {
            fabricContext += `- ${post.preview || post.content}\n`;
          });
        }
      }
    } catch (localDataErr) {
      console.error('Failed to fetch local Google/Instagram data:', localDataErr);
    }

    // Calculate trip duration
    let duration = '';
    if (requestData.startDate && requestData.endDate) {
      const start = new Date(requestData.startDate);
      const end = new Date(requestData.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      duration = `${days} day${days !== 1 ? 's' : ''}`;
    }

    // Construct detailed prompt for OpenAI - focus on preserving existing content
    const prompt = `
You are updating a travel itinerary based on changed parameters. Your response MUST preserve the COMPLETE original itinerary structure and content.

CRITICAL INSTRUCTIONS:
1. ALWAYS return the FULL itinerary - every day, every activity, every section
2. PRESERVE ALL existing recommendation markers: [FRIEND_REC:VenueName], [WEB_REC:VenueName:URL], and [FABRIC_REC:venue:source:topic]
3. NEVER remove or modify existing markers
4. Make only targeted changes based on what parameters changed
5. Your response should be AT LEAST as long as the original itinerary
6. Keep 90%+ of the original content intact

**Current Complete Itinerary (${requestData.currentContent.length} characters):**
"""
${requestData.currentContent}
"""

**Updated Parameters:**
- Destination: ${requestData.destination}
- Duration: ${duration || 'Flexible duration'}
- Budget Level: ${requestData.budget ? '$'.repeat(requestData.budget) : '$$$'} (1=budget, 5=ultra-luxury)
- Travel Interests: ${requestData.interests || 'General travel'}
- Travel Style: ${requestData.travelStyle || 'Balanced exploration'}
- User Base Location: ${userLocation}
- Preferred Currency: ${userCurrency}

**Additional Context:**
${requestData.ragContext || 'No additional context provided'}

${fabricContext}

**Friend Recommendations:**
${JSON.stringify(requestData.friendRecommendations || {}, null, 2)}

**What to Update:**
Based on the changed parameters above, make MINIMAL, TARGETED updates to:
1. If budget changed: Update accommodation and dining recommendations to match new budget level
2. If interests changed: Adjust activities to align with new interests (but keep structure)
3. If dates/duration changed: Adjust day headers and timing (but keep activities)
4. If destination changed: Update all content to new destination

**What to PRESERVE (CRITICAL):**
1. ALL recommendation markers: [FRIEND_REC:VenueName], [WEB_REC:VenueName:URL], [FABRIC_REC:venue:source:topic]
2. The exact structure and format of all sections
3. All existing activities and recommendations (unless budget/interests require changes)
4. All markdown links [text](url)
5. The Morning/Afternoon/Evening/Night structure for each day

**FORMATTING REQUIREMENTS (MUST BE PRESERVED EXACTLY):**
- Section headers: **Trip Summary**, **Getting There**, **Perfect Stay**, **Day-by-Day Itinerary**, **Travel Tips**, **Booking Links**
- Use bullet points • for all lists
- Day structure (CRITICAL for parsing):
  **Day 1: [Title]**
  
  • Morning:
  • Activity with brief description
  
  • Afternoon:
  • Activity with brief description
  
  • Evening:
  • Activity with brief description
  
  • Night:
  • Activity or note

- For other sections: use bullet points • with bold sub-headers like **Budget:** or **Local Customs:**
- Embed URLs as markdown hyperlinks: [Text](URL), never show raw URLs
- Keep concise, actionable content

**Additional Fabric Keywords Available:**
- Search Keywords: ${fabricKeywords.search.slice(0, 20).join(', ') || 'None'}
- Instagram Topics: ${fabricKeywords.instagram.slice(0, 15).join(', ') || 'None'}

${fabricContext ? `
**Personalization Data:**
${fabricContext}

You MAY add new FABRIC_REC markers for venues matching user interests, but do NOT remove existing ones.
` : ''}

NOW PROVIDE THE COMPLETE UPDATED ITINERARY:
- Include ALL days from the original
- Include ALL activities and recommendations
- PRESERVE all existing [FRIEND_REC], [WEB_REC], and [FABRIC_REC] markers
- Apply only the necessary updates based on changed parameters
- Maintain Morning/Afternoon/Evening/Night structure
- Use bullet points • for all lists
- Embed URLs as hyperlinks
- Your response must be a complete, standalone itinerary
`;

    console.log('Calling OpenAI API for itinerary regeneration...');
    console.log('OpenAI API key present:', !!openAIApiKey);
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: "You are a travel itinerary editor who updates itineraries while preserving their structure. CRITICAL RULES: 1) ALWAYS return the COMPLETE itinerary with ALL sections and days 2) Your response MUST be at least " + Math.floor(requestData.currentContent.length * 0.8) + " characters 3) PRESERVE ALL recommendation markers: [FRIEND_REC], [WEB_REC], [FABRIC_REC] - NEVER remove them 4) Make only targeted changes based on what parameters changed 5) Keep 90%+ of original content intact 6) Use bullet points • for all lists 7) Maintain Morning/Afternoon/Evening/Night structure 8) Embed URLs as markdown [text](url) with NO SPACES 9) Write in natural, conversational language like texting a friend 10) NEVER say 'rest remains the same' or summarize - output the FULL itinerary"
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 5000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated itinerary content, updating database...');

    // Update the itinerary in the appropriate table
    // First try saved_itineraries, then trips if not found
    const { error: updateError1 } = await supabase
      .from('saved_itineraries')
      .update({
        itinerary_content: generatedContent,
        destination: requestData.destination,
        start_date: requestData.startDate || null,
        end_date: requestData.endDate || null,
        budget: requestData.budget || null,
        interests: requestData.interests ? requestData.interests.split(', ') : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestData.itineraryId)
      .eq('user_id', userId);

    // If update to saved_itineraries failed, try trips table
    if (updateError1) {
      console.log('Saved itinerary not found, trying trips table...');
      const { error: updateError2 } = await supabase
        .from('trips')
        .update({
          description: generatedContent,
          destination: requestData.destination,
          start_date: requestData.startDate || null,
          end_date: requestData.endDate || null,
          cost: requestData.budget ? '$'.repeat(requestData.budget) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestData.itineraryId)
        .eq('user_id', userId);

      if (updateError2) {
        throw new Error(`Failed to update itinerary: ${updateError2.message}`);
      }
    }

    console.log('Itinerary regeneration completed successfully');

    // Send notification to user using direct database insert
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'itinerary_updated',
        title: 'Itinerary Updated',
        message: `Your iter to ${requestData.destination} has been updated, check it out in saved trips`,
        data: { itinerary_id: requestData.itineraryId }
      });

  } catch (error) {
    console.error('Error in regenerateItineraryBackground:', error);
    
    // Create error notification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'system_message',
        title: 'Itinerary Update Failed',
        message: `Failed to update your ${requestData.destination} itinerary. Please try again.`,
        data: { itinerary_id: requestData.itineraryId, error: (error as Error)?.message || 'Unknown error' }
      });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    console.log('Authorization header value:', authHeader?.substring(0, 20) + '...');
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(JSON.stringify({
        error: 'Auth session missing!',
        details: 'No authorization header provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Environment variables:', { 
      supabaseUrl: !!supabaseUrl, 
      supabaseAnonKey: !!supabaseAnonKey
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get the current user using the JWT from the authorization header
    console.log('Attempting to get user...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('Auth result:', { 
      user: !!user, 
      userId: user?.id, 
      authError: authError?.message,
      authErrorCode: authError?.status
    });
    
    if (authError) {
      console.error('Authentication error details:', authError);
      return new Response(JSON.stringify({
        error: 'Auth session missing!',
        details: `Authentication failed: ${authError.message}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.error('No user found in token');
      return new Response(JSON.stringify({
        error: 'Auth session missing!',
        details: 'No user found in session'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the request body
    const requestData: RegenerateItineraryData = await req.json();
    
    console.log('Received itinerary update request:', {
      itineraryId: requestData.itineraryId,
      destination: requestData.destination,
      userId: user.id
    });

    // Validate required fields
    if (!requestData.itineraryId || !requestData.destination || !requestData.currentContent) {
      throw new Error('Missing required fields: itineraryId, destination, or currentContent');
    }

    // Start background processing
    // EdgeRuntime.waitUntil(
    //   regenerateItineraryBackground(requestData, authHeader, user.id)
    // );

    // Return immediate response
    return new Response(JSON.stringify({
      status: 'processing',
      message: 'Itinerary update started in background',
      destination: requestData.destination
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-itinerary function:', error);
    return new Response(JSON.stringify({
      error: (error as Error)?.message || 'Unknown error',
      details: 'Failed to start itinerary update process'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});