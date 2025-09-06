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
        profiles:user_id(name, username, avatar)
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
      `Post by ${post.profiles?.name || post.profiles?.username || 'Anonymous'}: ${post.content}`
    ).join('\n\n') || 'No relevant saved posts found.';

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

    // Create comprehensive prompt for a natural-sounding itinerary
    const prompt = `Create a detailed travel itinerary for ${destination} from ${startDate || 'flexible dates'} to ${endDate || 'flexible dates'}.

Budget level: ${budget ? '$'.repeat(budget) : 'Flexible'}
Interests: ${interests || 'General exploration'}
${travelStyle ? `Travel notes: ${travelStyle}` : ''}

${postsContext !== 'No relevant saved posts found.' ? `\nInsider recommendations from travelers:\n${postsContext}\n` : ''}

Write this as a clean, professional itinerary guide with:
- Clear daily schedules with realistic timings
- Specific venue names and neighborhoods
- Transportation details between locations
- Price ranges for activities and meals
- Local insider tips
- Weather/seasonal considerations

Use a natural, informative tone like a travel guidebook. Avoid phrases like "I recommend" or "you should". Write directly about the activities.

Format with clear sections for each day.`;

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
              content: 'You are a professional travel writer creating guidebook-style itineraries. Write in a direct, informative style without personal pronouns. Focus on practical details and authentic experiences.' 
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
          destination: destination
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