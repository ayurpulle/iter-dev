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

    const { destination, startDate, endDate, budget, interests, travelStyle } = await req.json();
    console.log('Request params:', { destination, startDate, endDate, budget, interests, travelStyle });

    if (!destination) {
      return new Response(
        JSON.stringify({ error: 'Destination is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Search for relevant saved posts from the user's network
    console.log('Searching for relevant posts...');
    const { data: posts, error: postsError } = await supabaseClient
      .from('posts')
      .select(`
        *,
        profiles:user_id(display_name, avatar_url)
      `)
      .ilike('content', `%${destination}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    console.log(`Found ${posts?.length || 0} relevant posts`);

    // Prepare context from saved posts
    const postsContext = posts?.map(post => 
      `Post by ${post.profiles?.display_name || 'Anonymous'}: ${post.content}`
    ).join('\n\n') || 'No relevant saved posts found.';

    // Create comprehensive prompt for GPT-4
    const prompt = `You are an expert travel planner. Generate a detailed day-by-day itinerary based on the following requirements and context:

TRIP REQUIREMENTS:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate}
- Budget: ${budget || 'Not specified'}
- Interests: ${interests || 'General tourism'}
- Travel Style: ${travelStyle || 'Balanced'}

CONTEXT FROM SAVED TRAVEL POSTS:
${postsContext}

Please create a comprehensive itinerary that includes:
1. Day-by-day breakdown with specific activities and timings
2. Recommended restaurants and local cuisine
3. Transportation suggestions between locations
4. Accommodation recommendations (if budget specified)
5. Cultural highlights and must-see attractions
6. Hidden gems and local experiences
7. Budget estimates for major activities
8. Practical tips specific to the destination

Format the response as a well-structured itinerary that's easy to read and follow. Be specific with locations, times, and practical details.`;

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
            content: 'You are an expert travel planner with extensive knowledge of destinations worldwide. Create detailed, practical itineraries that combine popular attractions with authentic local experiences.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
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
        postsUsed: posts?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

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