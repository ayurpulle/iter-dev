import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Background task for itinerary generation
  async function generateItineraryBackground(requestData: any, authHeader: string, userId: string) {
    try {
      console.log('Starting background itinerary generation for user:', userId);
      
      // Create Supabase client for background task
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { destination, startDate, endDate, budget, interests, travelStyle, ragContext, friendRecommendations, existingItinerary, changeRequest, inspirationSource, inspirationFolder } = requestData;
      console.log('Request params:', { 
        destination, 
        startDate, 
        endDate, 
        budget: budget, 
        budgetType: typeof budget,
        interests: interests, 
        interestsType: typeof interests,
        travelStyle, 
        hasRAGContext: !!ragContext, 
        hasExistingItinerary: !!existingItinerary, 
        changeRequest, 
        inspirationSource, 
        inspirationFolder 
      });

      // Initialize Fabric keywords outside try-catch for broader scope
      const fabricKeywords: { search: string[], instagram: string[] } = { search: [], instagram: [] };

      // Fetch Fabric API recommendations if connected
      let fabricContext = '';
      try {
        console.log('Checking for Fabric connection...');
        const { data: fabricConnection } = await supabaseClient
          .from('fabric_connections')
          .select('access_token, status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (fabricConnection?.access_token) {
          console.log('Fetching Fabric API recommendations for destination:', destination);
          
          // Parse interests into array if it's a string
          const interestsArray = typeof interests === 'string' 
            ? interests.split(',').map((i: string) => i.trim()) 
            : Array.isArray(interests) 
              ? interests 
              : [];

          // Fetch API recommendations
          const { data: fabricRecs, error: fabricError } = await supabaseClient.functions.invoke(
            'fetch-fabric-recommendations',
            {
              body: {
                destination,
                interests: interestsArray,
                accessToken: fabricConnection.access_token
              }
            }
          );

          if (fabricError) {
            console.error('Error fetching Fabric recommendations:', fabricError);
          } else if (fabricRecs && Array.isArray(fabricRecs) && fabricRecs.length > 0) {
            console.log(`Found ${fabricRecs.length} Fabric API recommendations`);
            fabricContext = `\n\nFABRIC PERSONALIZED RECOMMENDATIONS (from your digital self):\n${
              fabricRecs.map((rec: any) => 
                `- ${rec.title}${rec.url ? ` (${rec.url})` : ''}${rec.content ? `: ${rec.content}` : ''}`
              ).join('\n')
            }\n`;
          }
        } else {
          console.log('No active Fabric connection found for user');
        }
      } catch (fabricErr) {
        console.error('Failed to fetch Fabric API data:', fabricErr);
        // Continue without Fabric API data
      }

      // Query local Google Search and Instagram data tables (always, not just with Fabric connection)
      try {
        console.log('Querying local Google Search and Instagram data...');
        const destinationKeywords = destination.toLowerCase().split(/[\s,]+/);
        
        // Query Google Search summaries for rich context
        const { data: searchSummaries } = await supabaseClient
          .from('google_search_summaries')
          .select('summary_content, summary_date, metadata')
          .eq('user_id', userId)
          .order('summary_date', { ascending: false })
          .limit(8);

        const { data: searchData } = await supabaseClient
          .from('google_search_raw_threads')
          .select('content, preview, details, asat')
          .eq('user_id', userId)
          .order('asat', { ascending: false })
          .limit(50);

        const { data: instagramData } = await supabaseClient
          .from('instagram_interactions')
          .select('content, preview, details')
          .eq('user_id', userId)
          .order('asat', { ascending: false })
          .limit(30);

        console.log(`Found ${searchSummaries?.length || 0} search summaries, ${searchData?.length || 0} search records, and ${instagramData?.length || 0} Instagram records`);

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
          // Extract potential venue names and keywords
          const venueMatches = text.match(/(?:restaurant|hotel|cafe|bar|museum|beach|park|market|temple|church|palace|tower|arena|stadium|theater)\s+[\w\s]+|[\w\s]+(?:restaurant|hotel|cafe|bar|museum|beach|park|market|temple|church|palace|tower|arena|stadium|theater)/gi);
          if (venueMatches) {
            venueMatches.forEach(match => {
              const cleaned = match.trim().slice(0, 50);
              if (!fabricKeywords.search.includes(cleaned)) {
                fabricKeywords.search.push(cleaned);
              }
            });
          }
          // Extract key topic words (sports teams, activities, etc.)
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
          
          console.log(`Found ${relevantSearches.length} relevant searches and ${relevantInstagram.length} Instagram posts`);
          console.log('Extracted keywords - Search:', fabricKeywords.search.slice(0, 5), 'Instagram:', fabricKeywords.instagram.slice(0, 5));
        }
      } catch (localDataErr) {
        console.error('Failed to fetch local Google/Instagram data:', localDataErr);
        // Continue without local data
      }

      // Get user's saved posts to use as review bank (filter by folder if specified)
      console.log('Fetching user saved posts for review bank...');
      
      // First get saved items that are posts
      const { data: savedPostItems, error: savedItemsError } = await supabaseClient
        .from('saved_items')
        .select('item_id, folder_id')
        .eq('user_id', userId)
        .eq('item_type', 'post');

      if (savedItemsError) {
        console.error('Error fetching saved items:', savedItemsError);
        return;
      }

      // If we have saved post items, get the actual posts
      let savedItems: any[] = [];
      if (savedPostItems && savedPostItems.length > 0) {
        const postIds = savedPostItems.map(item => item.item_id);
        const { data: posts, error: postsError } = await supabaseClient
          .from('posts')
          .select(`
            id,
            content,
            user_id,
            trips (title, destination, stops)
          `)
          .in('id', postIds);

        if (postsError) {
          console.error('Error fetching posts:', postsError);
        } else {
          // Map saved items with their posts
          savedItems = savedPostItems.map(item => ({
            ...item,
            posts: posts?.find(post => post.id === item.item_id)
          })).filter(item => item.posts); // Only keep items that have valid posts
        }
      }

      // Apply folder filtering if specified
      if (inspirationSource === 'folder' && inspirationFolder && inspirationFolder !== 'all') {
        // Find the folder ID by name first
        const { data: folders } = await supabaseClient
          .from('item_folders')
          .select('id')
          .eq('user_id', userId)
          .eq('name', inspirationFolder)
          .single();
        
        if (folders) {
          // Filter savedItems by folder_id
          savedItems = savedItems.filter(item => item.folder_id === folders.id);
        }
      }

      console.log(`Found ${savedItems?.length || 0} saved posts for review bank`);

      // Extract venue recommendations from user's saved posts
      const reviewBank: { [venue: string]: any[] } = {};
      const destinationKeywords = destination.toLowerCase().split(/[\s,]+/).filter((word: string) => word.length > 2);
      
      if (savedItems?.length) {
        savedItems.forEach(savedItem => {
          const post = savedItem.posts;
          if (!post || !post.content) return;

          const postContent = post.content.toLowerCase();
          const tripTitle = post.trips?.title?.toLowerCase() || '';
          
          // Check if post is relevant to destination
          const isRelevant = destinationKeywords.some((keyword: string) => 
            postContent.includes(keyword) || tripTitle.includes(keyword)
          );

          if (!isRelevant) return;

          // Extract venues from post content using enhanced patterns
          const content = post.content;
          const venuePatterns = [
            /(?:stayed at|hotel|accommodation)[\s:]+([^.!?]+)/gi,
            /(?:ate at|restaurant|dinner at|lunch at|food at)[\s:]+([^.!?]+)/gi,
            /(?:visited|went to|saw|museum|gallery|attraction)[\s:]+([^.!?]+)/gi,
            /(?:bar|pub|drinks at|club)[\s:]+([^.!?]+)/gi,
            /(?:loved|amazing|incredible|beautiful|must-visit)[\s:]*([^.!?]+)/gi,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Restaurant|Hotel|Bar|Cafe|Museum|Gallery|Park|Beach|Market|Church|Temple|Palace|Tower|Bridge)))(?:\s|$|[,.!?])/g
          ];
          
          // Also extract from photo details if available
          let allContent = content;
          if (post.trips?.stops) {
            try {
              const stops = JSON.parse(post.trips.stops);
              if (Array.isArray(stops)) {
                stops.forEach(stop => {
                  if (stop.photo_details) {
                    stop.photo_details.forEach((detail: any) => {
                      if (detail.caption) {
                        allContent += ' ' + detail.caption;
                      }
                    });
                  }
                });
              }
            } catch (e) {
              // Invalid JSON, continue with just the content
            }
          }

          venuePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(allContent)) !== null) {
              const venue = match[1]?.trim();
              if (venue && venue.length > 2 && venue.length < 100) {
                const cleanVenue = venue.replace(/[\[\]()]/g, '').trim();
                if (!reviewBank[cleanVenue]) {
                  reviewBank[cleanVenue] = [];
                }
                reviewBank[cleanVenue].push({
                  user: post.profiles?.name || post.profiles?.username || 'Someone',
                  avatar: post.profiles?.avatar,
                  review: content,
                  postId: post.id
                });
              }
            }
          });
        });
      }

      // Get friends' posts as additional context (legacy approach for compatibility)
      const { data: friends } = await supabaseClient
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      const friendIds = friends?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];

      const { data: friendsPosts, error: friendsPostsError } = await supabaseClient
        .from('posts')
        .select(`
          id,
          content,
          user_id
        `)
        .in('user_id', friendIds)
        .ilike('content', `%${destination}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log(`Found ${friendsPosts?.length || 0} relevant posts from friends`);

      // Prepare context from saved posts review bank
      const reviewBankContext = Object.keys(reviewBank).length > 0 
        ? `\n\nREVIEW BANK (from your saved posts):\n${Object.entries(reviewBank).map(([venue, recs]) => 
            `- ${venue}: ${recs.map(rec => `"${rec.review}" - ${rec.user}`).join('; ')}`
          ).join('\n')}`
        : '';

      const friendsPostsContext = friendsPosts?.map((post: any) => 
        `${post.name || post.username || 'Anonymous'}: ${post.content}`
      ).join('\n\n') || '';

      // Use provided friend recommendations from RAG, or combine review bank with extracted ones
      const finalFriendRecommendations = friendRecommendations || reviewBank;

      // Handle OpenAI API quota issues gracefully
      if (!openAIApiKey) {
        console.error('OpenAI API key not configured');
        throw new Error('AI service temporarily unavailable');
      }

      // Get user's profile for currency preferences
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('default_currency, base_location')
        .eq('user_id', userId)
        .single();

      const defaultCurrency = userProfile?.default_currency || 'USD';
      const baseLocation = userProfile?.base_location || 'United States';

      // Calculate trip duration in days
      const duration = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 7; // Default to 7 days if dates not provided

      const prompt = `You are an expert travel planner. Create a comprehensive itinerary for a ${duration}-day trip to ${destination}.

Trip Details:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate}
- Budget Level: ${budget ? '$'.repeat(parseInt(budget.toString())) : 'Not specified'}
- Travel Style: ${travelStyle || 'Not specified'}  
- Interests: ${interests || 'General travel'}

${fabricContext}

${reviewBankContext}

${friendsPostsContext ? `\n\nFriends who've been there say:\n${friendsPostsContext}\n` : ''}

Create a structured itinerary with these sections:

**Trip Summary** 
Generate a personalized 2-line summary that captures the unique essence and highlights of this specific ${destination} trip, considering the travel style, interests, and duration.

**Getting There**
• Flight recommendations and booking tips
• Airport transfer options  
• Any travel documentation needed

**Perfect Stay**  
• Accommodation recommendations (3-4 options across different price points)
• Best neighborhoods to stay in
• Booking tips and timing

**Day-by-Day Itinerary**
For each day, organize activities by time periods (Morning, Afternoon, Evening, Night) using bullet points:
• Morning: [Activity/attraction with brief description]
• Afternoon: [Activity/attraction with brief description]  
• Evening: [Restaurant and activity recommendations]
• Night: [Optional nightlife or relaxation suggestions]

Keep descriptions concise but well-written, avoid overly specific times. Focus on experiences rather than rigid schedules.

**Travel Tips**
• Local customs and etiquette
• Transportation within the destination  
• Money and payment tips
• What to pack
• Safety considerations
• Best times to visit attractions

**Booking Links**
• Direct links to recommended hotels
• Restaurant reservation information
• Attraction tickets and tours
• Transportation booking links

**CRITICAL: RECOMMENDATION MARKING REQUIREMENTS** 
YOU MUST include recommendation markers in your itinerary. This is NOT optional:

1. **FABRIC_REC Markers (HIGHEST PRIORITY - use these when user interests match):**
   - Search Keywords Available: ${fabricKeywords.search.slice(0, 20).join(', ') || 'None'}
   - Instagram Topics Available: ${fabricKeywords.instagram.slice(0, 15).join(', ') || 'None'}
   - When recommending venues matching these keywords/topics, mark with [FABRIC_REC:venue_name:source_type:personal_reason]
   - CRITICAL: The "personal_reason" field must be STRIKINGLY PERSONALIZED - analyze the user's searches/activity holistically to understand their deeper interests and sentiment
   - DO NOT just use search titles or keywords - amalgamate their interests to create a unique, personal reason
   - Examples of GOOD personalization:
     * Museum + art searches + cultural interests → "your passion for Renaissance art and cultural immersion"
     * Lakers searches + sports bar visits + game highlights → "your love for live basketball and the Lakers game day atmosphere"  
     * Beach posts + sunset photos + coastal dining → "your preference for oceanfront dining and golden hour moments"
     * Coffee shop searches + specialty roasts + cafe culture → "your appreciation for artisanal coffee and cozy cafe workspaces"
   - Examples of BAD personalization (TOO GENERIC):
     * "search:Lakers" ❌
     * "instagram:museum" ❌
     * "search:restaurant" ❌
   - Format: [FABRIC_REC:Crypto.com Arena:search:your love for live basketball and the Lakers game day atmosphere]
   - These show as purple/pink highlighted text to indicate deeply personalized recommendations

2. **WEB_REC Markers (SECONDARY PRIORITY - use for venues NOT covered by FABRIC_REC):**
   - For restaurants, hotels, attractions NOT already recommended via FABRIC_REC, mark with [WEB_REC:venue_name:https://tripadvisor.com/...]
   - Example: "Try Joe's Pizza [WEB_REC:Joe's Pizza:https://tripadvisor.com/restaurant/joes-pizza] for authentic NY slices"
   - Use real, plausible URLs for TripAdvisor, Booking.com, OpenTable, etc.
   - CRITICAL: Do NOT use WEB_REC for a venue if you already used FABRIC_REC for the same venue

3. **SAVED_REC Markers (when from review bank):**
   - Mark venues from saved posts with [SAVED_REC:venue_name:user_name]

**DEDUPLICATION RULE (CRITICAL):**
- Each venue should have ONLY ONE type of recommendation marker
- Priority order: FABRIC_REC > SAVED_REC > WEB_REC
- If a venue matches user interests (Fabric data), use FABRIC_REC and do NOT add WEB_REC for the same venue

${fabricContext ? `
**YOUR PERSONALIZATION DATA TO USE:**
${fabricContext}

Based on this data, you MUST include personalized FABRIC_REC recommendations that match the user's interests.
` : ''}

Focus on creating a practical, actionable itinerary that balances popular attractions with authentic local experiences.`;

      console.log('Calling OpenAI API...');
      
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
              content: `You are an expert travel planner creating detailed, practical itineraries.

CRITICAL WRITING STYLE:
- Write in natural, conversational language - NOT like AI-generated content
- Use simple, direct sentences after bullet points
- Keep descriptions concise and human-sounding
- Avoid flowery or overly enthusiastic language
- Write like you're texting travel advice to a friend

CRITICAL RECOMMENDATION REQUIREMENTS (NON-NEGOTIABLE):
- YOU MUST include recommendation markers - without them, the itinerary is INCOMPLETE and UNUSABLE
- PRIORITY ORDER: FABRIC_REC first, then WEB_REC for remaining venues (NO DUPLICATES)
- FABRIC_REC format: [FABRIC_REC:venue:source:deeply_personal_reason] where source is "search" or "instagram"
- WEB_REC format: [WEB_REC:venue:URL] - only for venues NOT covered by FABRIC_REC
- Examples:
  * "Catch a Lakers game at Crypto.com Arena [FABRIC_REC:Crypto.com Arena:search:your love for live basketball and the Lakers game day atmosphere]"
  * "Sunset at Santa Monica Pier [FABRIC_REC:Santa Monica Pier:instagram:your preference for oceanfront dining and golden hour moments]"
  * "Visit Blue Bottle Coffee [WEB_REC:Blue Bottle Coffee:https://tripadvisor.com/blue-bottle]" (only if no Fabric match)

CRITICAL STRUCTURE REQUIREMENTS:
- Use section headers: **Trip Summary**, **Getting There**, **Perfect Stay**, **Day-by-Day Itinerary**, **Travel Tips**, **Booking Links**
- For day-by-day section, ALWAYS use format: **Day 1: [Title]** (this is critical for parsing)
- Use bullet points • for lists in ALL sections
- Embed links as markdown: [Text](URL) with NO SPACES between brackets and parentheses, and NO SPACES in URLs

FORMATTING FOR EACH DAY:
**Day 1: [Arrival & Exploration]**

• Morning:
• Activity with brief description [WEB_REC:venue:URL]
• Activity with brief description

• Afternoon:  
• Activity with brief description [FABRIC_REC:venue:search:keyword]

• Evening:
• Restaurant recommendation [WEB_REC:venue:URL]

• Night:
• Activity with brief description

Keep each section clear and parseable. Maintain this exact structure. Write naturally across all sections.`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
        }),
      });

      console.log('OpenAI response received');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedItinerary = data.choices[0].message.content;

      // Save the trip to the database
      // Note: interests comes as encoded array from TripPlanning, budget comes as number
      console.log('Saving trip with encoded values:', { 
        interests, 
        interestsType: typeof interests, 
        budget, 
        budgetType: typeof budget 
      });
      
      const { data: savedTrip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          user_id: userId,
          title: `${destination} Trip`,
          destination: destination,
          start_date: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
          end_date: endDate ? new Date(endDate).toISOString().split('T')[0] : null,
          hashtags: Array.isArray(interests) ? interests : (interests ? interests.split(', ') : null),
          overall_budget: budget || null,
          description: generatedItinerary,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tripError) {
        console.error('Error saving trip:', tripError);
        throw new Error('Failed to save itinerary');
      }

      console.log('Trip saved successfully:', savedTrip.id);

      // Create notification for the user
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system_message',
          title: 'Your Itinerary is Ready!',
          message: `Your ${destination} itinerary has been generated and is ready to view.`,
          data: {
            trip_id: savedTrip.id,
            destination: destination,
            friend_recommendations: finalFriendRecommendations
          }
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      } else {
        console.log('Notification created successfully');
      }

      console.log('Background itinerary generation completed successfully');

    } catch (error) {
      console.error('Error in background itinerary generation:', error);
      
      // Create error notification
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system_message',
          title: 'Itinerary Generation Failed',
          message: 'We encountered an issue generating your itinerary. Please try again.',
          data: { error: (error as Error)?.message }
        });
    }
  }

  try {
    console.log('Starting itinerary generation request');
    console.log('Authorization header present:', !!req.headers.get('Authorization'));
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User verification result:', { userId: user?.id, email: user?.email, authError });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData = await req.json();

    // Start the background itinerary generation and await it
    await generateItineraryBackground(requestData, authHeader, user.id);

    // Return immediate response
    return new Response(JSON.stringify({ 
      message: 'Itinerary generation started. You will receive a notification when it\'s ready.',
      status: 'processing',
      destination: requestData.destination
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    return new Response(JSON.stringify({ error: (error as Error)?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});