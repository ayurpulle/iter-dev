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

    // Prepare context from saved posts and extract venue recommendations
    const postsContext = posts?.map(post => 
      `${post.profiles?.name || post.profiles?.username || 'Anonymous'}: ${post.content}`
    ).join('\n\n') || 'No relevant saved posts found.';

    // Extract venues and friend recommendations for the response
    const friendRecommendations: { [key: string]: any[] } = {};
    
    posts?.forEach(post => {
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
            if (!friendRecommendations[cleanVenueName]) {
              friendRecommendations[cleanVenueName] = [];
            }
            
            friendRecommendations[cleanVenueName].push({
              name: profile?.name || profile?.username || 'Anonymous',
              avatar: profile?.avatar,
              review: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              visitDate: new Date(post.created_at).toLocaleDateString(),
            });
          }
        }
      });
    });

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

    // Create a natural, user-friendly prompt for travel recommendations
    const prompt = `I'm planning a trip to ${destination} from ${startDate || 'flexible dates'} to ${endDate || 'flexible dates'}.

My details:
- Base location: ${baseLocation}
- Budget level: ${budget ? '$'.repeat(budget) : 'Flexible'}  
- Interests: ${interests || 'General exploration'}
${travelStyle ? `- Travel style: ${travelStyle}` : ''}

${postsContext !== 'No relevant saved posts found.' ? `\nFriends who've been there say:\n${postsContext}\n` : ''}

Please create a natural, conversational itinerary that feels like it was written by a knowledgeable local friend, not an AI. 

TONE & STYLE:
- Write like you're texting a friend travel tips
- Use natural, casual language 
- Skip formal headings and robotic structure
- Make it feel personal and authentic
- Use "you'll love" instead of "visitors can enjoy"

FORMAT REQUIREMENTS:
- Maximum 300 words total
- Group by days but keep it flowing
- Show prices in ${defaultCurrency} first, then local currency: ${defaultCurrency}25 (€23)
- Use exchange rates: USD→EUR=0.92, USD→GBP=0.79, USD→JPY=150, USD→CAD=1.35
- When mentioning specific places friends visited, add [FRIEND_REC:place_name]
- Focus on 2-3 key things per day maximum

Example style:
"Day 1: Land and grab coffee at Blue Bottle (${defaultCurrency}5/€5) - you'll need it! Check into your hotel then wander through Union Square. For dinner, hit up Swan Oyster Depot [FRIEND_REC:Swan_Oyster_Depot] - the seafood is incredible and locals love it (${defaultCurrency}40/€37).

Day 2: Golden Gate Bridge in the morning when it's clear, then Alcatraz tour (${defaultCurrency}45/€41). End at Fisherman's Wharf for clam chowder..."

Keep this natural, friendly tone throughout. No bullet points or formal sections - just flowing, helpful advice.`;

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
              content: 'You are a well-traveled friend sharing personal travel advice. Write naturally and conversationally, like you\'re texting recommendations to a close friend. Avoid formal language, bullet points, or obvious AI formatting. Share tips like a local would, with genuine enthusiasm for the places you\'re recommending.' 
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
          destination: destination,
          friendRecommendations: friendRecommendations
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