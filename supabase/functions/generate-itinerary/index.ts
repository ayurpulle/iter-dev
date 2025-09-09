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

    const { destination, startDate, endDate, budget, interests, travelStyle, ragContext, friendRecommendations, existingItinerary, changeRequest } = await req.json();
    console.log('Request params:', { destination, startDate, endDate, budget, interests, travelStyle, hasRAGContext: !!ragContext, hasExistingItinerary: !!existingItinerary, changeRequest });

    if (!destination) {
      return new Response(
        JSON.stringify({ error: 'Destination is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Search for relevant saved posts from the user's network with venue extraction
    console.log('Searching for relevant posts and friend recommendations...');
    
    // Get friends first
    const { data: friends } = await supabaseClient
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const friendIds = friends?.map(f => 
      f.user_id === user.id ? f.friend_id : f.user_id
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
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's profile for currency preferences
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('default_currency, base_location')
      .eq('user_id', user.id)
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

Create a travel itinerary that feels personal and conversational. Write like you're a knowledgeable local friend giving advice, not a formal travel guide.

Use this exact format:

SUMMARY:
Write a warm, engaging 2-3 sentence overview of the trip highlighting the best experiences. Make it sound exciting and personal, like "You're going to absolutely love ${destination}! This itinerary balances must-see sights with hidden gems, plus some amazing food spots your friends recommended."

FLIGHTS:
- Getting there: Suggest the best routes from ${baseLocation} to ${destination} with actual booking sites
- Coming home: Return flight suggestions with timing tips

ACCOMMODATION:
- Perfect stay: [Specific hotel with booking.com link and why it's great]
- Budget-friendly: [Alternative with why it's still awesome]

DAY-BY-DAY ITINERARY:

**Day 1: [Catchy theme like "First Taste of Magic" or "Getting Your Bearings"]**
- **Morning:** What to do first - include cost and why it's special
- **Lunch:** Where to eat with price range and what to order
- **Afternoon:** Main activity with practical tips
- **Dinner:** Restaurant recommendation with atmosphere description
- **Evening:** How to end the day (could be early rest or nightlife)
- **Daily budget:** Total expected cost

**Day 2: [Another engaging theme]**
[Continue same personal, detailed format]

[Continue for all ${duration} days]

BOOKING LINKS & TIPS:
- Flights: https://www.skyscanner.com/transport/flights/${baseLocation.toLowerCase().replace(/\s+/g, '-')}/${destination.toLowerCase().replace(/\s+/g, '-')}/
- Hotels: https://www.booking.com/searchresults.html?ss=${destination}
- Activities: https://www.getyourguide.com/s/?q=${destination}
- Local transport: [Specific apps or websites for ${destination}]

PRACTICAL TIPS:
Write 3-4 conversational tips about money, transport, culture, and communication. Make them personal and specific to ${destination}.

Guidelines:
- Write like you're texting a friend, not writing a formal guide
- Include specific prices in ${defaultCurrency} 
- When mentioning places friends visited, add [FRIEND_REC:place_name] after the venue name
- Focus on experiences, not just sightseeing
- Give insider tips about timing, crowds, and local customs
- Make each day feel distinct with its own personality`;

    console.log('Calling OpenAI API...');
    
    try {
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
              content: 'You are a professional travel planner creating detailed, structured itineraries. Provide practical, actionable advice with specific costs, booking links, and day-by-day schedules. Focus on efficiency and value while ensuring travelers have memorable experiences.' 
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
        
        // Handle quota exceeded specifically
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'AI service temporarily unavailable', 
              message: 'Please try again later or contact support if this continues.' 
            }),
            { 
              status: 503, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('OpenAI response received');
      
      const generatedItinerary = data.choices[0].message.content;

      // Save the generated itinerary as a trip
      const { data: newTrip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          title: `${destination} Itinerary`,
          description: generatedItinerary,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          budget: budget ? parseFloat(budget) : null,
        })
        .select()
        .single();

      if (tripError) {
        console.error('Error saving trip:', tripError);
        // Still return the itinerary even if saving fails
      } else {
        console.log('Trip saved successfully:', newTrip.id);
      }

      return new Response(
        JSON.stringify({ 
          itinerary: generatedItinerary,
          tripId: newTrip?.id,
          postsUsed: posts?.length || 0,
          destination: destination,
          friendRecommendations: finalFriendRecommendations
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (aiError) {
      console.error('Error with AI generation:', aiError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate itinerary', 
          message: 'AI service is currently unavailable. Please try again later.' 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate itinerary', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});