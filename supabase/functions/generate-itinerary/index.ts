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
      console.log('Request params:', { destination, startDate, endDate, budget, interests, travelStyle, hasRAGContext: !!ragContext, hasExistingItinerary: !!existingItinerary, changeRequest, inspirationSource, inspirationFolder });

      // Get user's saved posts to use as review bank (filter by folder if specified)
      console.log('Fetching user saved posts for review bank...');
      
      let savedItemsQuery = supabaseClient
        .from('saved_items')
        .select(`
          *,
          posts (
            *,
            profiles!posts_user_id_fkey (name, username, avatar),
            trips (title, destination, stops)
          )
        `)
        .eq('user_id', userId)
        .eq('item_type', 'post');

      // Filter by folder if specified
      if (inspirationSource === 'folder' && inspirationFolder && inspirationFolder !== 'all') {
        // Find the folder ID by name first
        const { data: folders } = await supabaseClient
          .from('item_folders')
          .select('id')
          .eq('user_id', userId)
          .eq('name', inspirationFolder)
          .single();
        
        if (folders) {
          savedItemsQuery = savedItemsQuery.eq('folder_id', folders.id);
        }
      }

      const { data: savedItems, error: savedItemsError } = await savedItemsQuery;

      if (savedItemsError) {
        console.error('Error fetching saved posts:', savedItemsError);
      }

      console.log(`Found ${savedItems?.length || 0} saved posts for review bank`);

      // Extract venue recommendations from user's saved posts
      const reviewBank: { [venue: string]: any[] } = {};
      const destinationKeywords = destination.toLowerCase().split(/[\s,]+/).filter(word => word.length > 2);
      
      if (savedItems?.length) {
        savedItems.forEach(savedItem => {
          const post = savedItem.posts;
          if (!post || !post.content) return;

          const postContent = post.content.toLowerCase();
          const tripTitle = post.trips?.title?.toLowerCase() || '';
          
          // Check if post is relevant to destination
          const isRelevant = destinationKeywords.some(keyword => 
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
                    stop.photo_details.forEach(detail => {
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
          *,
          profiles:user_id(name, username, avatar)
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

      const friendsPostsContext = friendsPosts?.map(post => 
        `${post.profiles?.name || post.profiles?.username || 'Anonymous'}: ${post.content}`
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
- Budget Level: ${budget ? '$'.repeat(budget) : 'Not specified'}
- Travel Style: ${travelStyle || 'Not specified'}
- Interests: ${interests || 'General travel'}

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

IMPORTANT: When recommending venues from the review bank, mark them with [SAVED_REC:venue_name:user_name] where user_name is the name of the user who created the saved post. Use bullet points for all sections.

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
              content: 'You are an expert travel planner that creates detailed, practical itineraries. Always format venue recommendations from saved posts with [SAVED_REC:venue_name:user_name] markers.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.7
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
      const { data: savedTrip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          user_id: userId,
          title: `${destination} Trip`,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          overall_budget: budget ? '$'.repeat(budget) : null,
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
          type: 'itinerary_ready',
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
          type: 'itinerary_error',
          title: 'Itinerary Generation Failed',
          message: 'We encountered an issue generating your itinerary. Please try again.',
          data: { error: error.message }
        });
    }
  }

  try {
    console.log('Starting itinerary generation request');
    
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
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData = await req.json();

    // Start the background itinerary generation
    EdgeRuntime.waitUntil(generateItineraryBackground(requestData, authHeader, user.id));

    // Return immediate response
    return new Response(JSON.stringify({ 
      message: 'Itinerary generation started. You will receive a notification when it\'s ready.',
      status: 'processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});