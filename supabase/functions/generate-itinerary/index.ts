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

      const { destination, startDate, endDate, budget, interests, travelStyle, ragContext, friendRecommendations, existingItinerary, changeRequest } = requestData;
      console.log('Request params:', { destination, startDate, endDate, budget, interests, travelStyle, hasRAGContext: !!ragContext, hasExistingItinerary: !!existingItinerary, changeRequest });

      // Search for relevant saved posts from the user's network with venue extraction
      console.log('Searching for relevant posts and friend recommendations...');
      
      // Get friends first
      const { data: friends } = await supabaseClient
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      const friendIds = friends?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];

      // Search posts from friends about the destination
      const { data: posts, error: postsError } = await supabaseClient
        .from('posts')
        .select(`
          *,
          profiles:user_id(name, username, avatar)
        `)
        .in('user_id', friendIds)
        .ilike('content', `%${destination}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) {
        console.error('Error fetching posts:', postsError);
      }

      console.log(`Found ${posts?.length || 0} relevant posts from friends`);

      // Prepare context from saved posts (use legacy approach if no RAG context provided)
      const postsContext = posts?.map(post => 
        `${post.profiles?.name || post.profiles?.username || 'Anonymous'}: ${post.content}`
      ).join('\n\n') || 'No relevant saved posts found.';

      // Use provided friend recommendations from RAG, or extract them here as fallback
      const finalFriendRecommendations = friendRecommendations || {};
      
      if (!friendRecommendations && posts?.length) {
        posts.forEach(post => {
          const profile = post.profiles;
          const content = post.content || '';
          
          // Simple venue extraction - look for common venue indicators
          const venuePatterns = [
            /(?:stayed at|hotel|accommodation)[\s:]+([^.!?]+)/gi,
            /(?:ate at|restaurant|dinner at|lunch at)[\s:]+([^.!?]+)/gi,
            /(?:visited|museum|gallery)[\s:]+([^.!?]+)/gi,
            /(?:bar|pub|drinks at)[\s:]+([^.!?]+)/gi,
          ];
          
          venuePatterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
              const venueName = match[1]?.trim().split(/[,\n]/)[0].trim();
              if (venueName && venueName.length > 3 && venueName.length < 50) {
                const cleanVenueName = venueName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                if (!finalFriendRecommendations[cleanVenueName]) {
                  finalFriendRecommendations[cleanVenueName] = [];
                }
                
                finalFriendRecommendations[cleanVenueName].push({
                  name: profile?.name || profile?.username || 'Anonymous',
                  avatar: profile?.avatar,
                  review: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                  visitDate: new Date(post.created_at).toLocaleDateString(),
                });
              }
            }
          });
        });
      }

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

      // Create a natural, user-friendly prompt for travel recommendations with RAG context
      const basePrompt = `I'm planning a trip to ${destination} from ${startDate || 'flexible dates'} to ${endDate || 'flexible dates'}.

My details:
- Base location: ${baseLocation}
- Budget level: ${budget ? '$'.repeat(budget) : 'Flexible'}  
- Interests: ${interests || 'General exploration'}
${travelStyle ? `- Travel style: ${travelStyle}` : ''}`;

      const ragPrompt = ragContext ? `${basePrompt}

${ragContext}` : `${basePrompt}

${postsContext !== 'No relevant saved posts found.' ? `\nFriends who've been there say:\n${postsContext}\n` : ''}`;

      const prompt = `${ragPrompt}

Create a travel itinerary that sounds natural and conversational, like advice from a well-traveled friend. Avoid formal language, bullet points, asterisks, and structured formatting that looks AI-generated.

Use this exact format:

SUMMARY:
Write exactly 3 lines that capture the essence of this trip. Each line should be a complete sentence about what makes this destination special. Focus on the overall experience, vibe, and highlights.

FLIGHTS:
Write a natural paragraph about flight options from ${baseLocation} to ${destination}, including practical advice about airlines, timing, and booking. Only mention specific booking sites if you're certain they work (like skyscanner.com or expedia.com).

ACCOMMODATION:
Write conversational recommendations about where to stay. Describe 2-3 options in paragraph form, explaining the neighborhood, vibe, and what type of traveler would love each place. Only include booking links if you can provide actual working URLs.

DAY-BY-DAY ITINERARY:

Day 1: [Engaging theme]
Write in natural paragraphs what to do each part of the day. Start with "Your first morning should begin with..." or "Wake up and head to..." Make it flow like a conversation. Include approximate costs in ${defaultCurrency} naturally in the text. Mention meal suggestions organically. End with evening plans.

Day 2: [Different theme]
Continue the same conversational style. Each day should feel distinct and build on the previous day's experiences.

[Continue for all ${duration} days]

BOOKING LINKS & TIPS:
Only include actual working links from major sites like skyscanner.com, booking.com, or getyourguide.com. Write this as friendly advice paragraphs, not bullet points. Include practical tips about local transport, payment methods, and cultural notes.

PRACTICAL TIPS:
Write 3-4 conversational paragraphs covering money matters, getting around, cultural etiquette, and communication. Make it personal and specific to ${destination}, like you're sharing insider knowledge.

Guidelines:
- Write in complete sentences and paragraphs, never use bullet points or asterisks
- Sound like a knowledgeable friend, not a travel guide
- Include specific prices naturally in conversation
- When mentioning places friends visited, add [FRIEND_REC:place_name] after the venue name
- Only include links if they're from major, trusted booking sites
- Make each day's personality shine through the writing style
- Focus on the experience and feelings, not just logistics`;

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
              content: `You are a specialized travel itinerary assistant. You ONLY respond to travel-related requests and use travel data as your knowledge base.

STRICT GUIDELINES:
1. ONLY generate travel itineraries, trip plans, and travel-related content
2. If asked about anything non-travel related, politely decline and redirect to travel topics
3. Use the provided user data (saved posts, friend recommendations, travel preferences) as your primary information source
4. Generate detailed, day-by-day travel itineraries with specific activities, locations, and timing
5. Include practical travel information like transportation, accommodation tips, and local insights
6. Consider the user's budget, interests, and travel dates when provided
7. Incorporate friend recommendations and saved travel experiences when relevant
8. Provide practical, actionable advice with specific costs, booking links, and day-by-day schedules
9. Focus on efficiency and value while ensuring travelers have memorable experiences
10. Write in a natural, conversational tone like advice from a well-traveled friend` 
            },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('OpenAI response received');
      
      const generatedItinerary = data.choices[0].message.content;

      // Save the generated itinerary as a trip (removed budget field that doesn't exist)
      const { data: newTrip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          user_id: userId,
          title: `${destination} Itinerary`,
          description: generatedItinerary,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          cost: budget ? `Budget Level ${budget}` : null,
        })
        .select()
        .single();

      if (tripError) {
        console.error('Error saving trip:', tripError);
        // Still continue to create notification even if saving fails
      } else {
        console.log('Trip saved successfully:', newTrip.id);
      }

      // Create notification for completion
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'itinerary_complete',
          title: 'Itinerary Ready!',
          message: `Your ${destination} itinerary has been generated and saved.`,
          data: { 
            tripId: newTrip?.id, 
            destination: destination,
            friendRecommendations: finalFriendRecommendations 
          }
        });

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
          message: 'There was an error generating your itinerary. Please try again.',
          data: { destination: requestData.destination }
        });
    }
  }

  try {
    console.log('Starting itinerary generation request');
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestData = await req.json();
    const { destination } = requestData;
    
    if (!destination) {
      return new Response(
        JSON.stringify({ error: 'Destination is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Start background generation
    EdgeRuntime.waitUntil(generateItineraryBackground(requestData, req.headers.get('Authorization')!, user.id));
    
    // Return immediate response
    return new Response(
      JSON.stringify({ 
        message: 'Itinerary generation started in background',
        destination: destination,
        status: 'processing'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start itinerary generation', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});