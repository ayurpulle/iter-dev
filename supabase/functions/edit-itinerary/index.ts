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

  // Background task for itinerary regeneration
  async function regenerateItineraryBackground(requestData: any, authHeader: string, userId: string) {
    try {
      console.log('Starting background itinerary regeneration for user:', userId);
      
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

      const { itineraryId, destination, startDate, endDate, budget, interests, travelStyle, ragContext, friendRecommendations } = requestData;
      
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

      // Create regeneration prompt with emphasis on changes
      const basePrompt = `I'm completely restructuring my trip to ${destination} from ${startDate || 'flexible dates'} to ${endDate || 'flexible dates'}.

IMPORTANT: This is a NEW itinerary with updated preferences that must be reflected throughout:
- Base location: ${baseLocation}
- Budget level: ${budget ? '$'.repeat(budget) + ' budget level (incorporate appropriate price ranges for this budget tier)' : 'Flexible budget'}  
- Key interests: ${interests || 'General exploration'} (focus activities and recommendations around these specific interests)
${travelStyle ? `- Travel style: ${travelStyle} (adjust recommendations to match this travel approach)` : ''}

Please create a completely fresh itinerary that reflects these updated preferences and budget constraints.`;

      const ragPrompt = ragContext ? `${basePrompt}

${ragContext}` : basePrompt;

      const prompt = `${ragPrompt}

Create a completely new travel itinerary that sounds natural and conversational, like advice from a well-traveled friend. Avoid formal language, bullet points, asterisks, and structured formatting that looks AI-generated.

Use this exact format:

SUMMARY:
Write exactly 3 lines that capture the essence of this trip. Each line should be a complete sentence about what makes this destination special. Focus on the overall experience, vibe, and highlights.

FLIGHTS:
Write a natural paragraph about flight options from ${baseLocation} to ${destination}, including practical advice about airlines, timing, and booking. Only mention specific booking sites if you're certain they work (like skyscanner.com or expedia.com).

ACCOMMODATION:
Write conversational recommendations about where to stay. Describe 2-3 options in paragraph form, explaining the neighborhood, vibe, and what type of traveler would love each place. Only include booking links if you can provide actual working URLs.

DAY-BY-DAY ITINERARY:

${duration > 14 ? 
  `For this ${duration}-day trip, group days by 2-3 day periods for better readability:

Days 1-2: [Engaging theme for arrival and orientation]
Write in natural paragraphs covering the first 2-3 days. Start with "Your first morning should begin with..." Make it flow like a conversation. Include approximate costs in ${defaultCurrency} naturally in the text. Mention meal suggestions organically.

Days 3-5: [Different theme for main exploration]
Continue the same conversational style. Each grouping should feel distinct and build on previous experiences.

[Continue grouping every 2-3 days for all ${duration} days]` :
  `Day 1: [Engaging theme]
Write in natural paragraphs what to do each part of the day. Start with "Your first morning should begin with..." or "Wake up and head to..." Make it flow like a conversation. Include approximate costs in ${defaultCurrency} naturally in the text. Mention meal suggestions organically. End with evening plans.

Day 2: [Different theme]
Continue the same conversational style. Each day should feel distinct and build on the previous day's experiences.

[Continue for all ${duration} days]`}

BOOKING LINKS & TIPS:
Only include actual working links from major sites like skyscanner.com, booking.com, or getyourguide.com. Write this as friendly advice paragraphs, not bullet points. Include practical tips about local transport, payment methods, and cultural notes.

PRACTICAL TIPS:
Write 3-4 conversational paragraphs covering money matters, getting around, cultural etiquette, and communication. Make it personal and specific to ${destination}, like you're sharing insider knowledge.

Guidelines:
- Write in complete sentences and paragraphs, never use bullet points or asterisks
- Sound like a knowledgeable friend, not a travel guide
- Include specific prices naturally in conversation that match the ${budget ? '$'.repeat(budget) : 'flexible'} budget level
- Tailor ALL recommendations to the specific interests: ${interests || 'general exploration'}
- When mentioning places friends visited, add [FRIEND_REC:place_name] after the venue name
- Only include links if they're from major, trusted booking sites
- Make each day's personality shine through the writing style
- Focus on the experience and feelings, not just logistics
- Ensure budget-appropriate suggestions throughout (activities, dining, accommodation)`;

      console.log('Calling OpenAI API for regeneration...');
      
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
              content: 'You are an expert travel planner who creates natural, conversational itineraries. Generate comprehensive travel plans that feel personal and authentic.'
            },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const generatedContent = data.choices[0].message.content;

      console.log('Generated content length:', generatedContent.length);

      // Update the itinerary in the database
      const { data: updateResult, error: updateError } = await supabaseClient
        .rpc('save_user_itinerary', {
          p_title: destination,
          p_destination: destination,
          p_start_date: startDate ? startDate.split('T')[0] : null,
          p_end_date: endDate ? endDate.split('T')[0] : null,
          p_budget: budget,
          p_interests: interests ? interests.split(', ') : [],
          p_itinerary_content: generatedContent,
          p_friend_recommendations: friendRecommendations || {}
        });

      if (updateError) {
        console.error('Error updating itinerary:', updateError);
        throw updateError;
      }

      // Also update the specific itinerary record if it exists
      const { error: directUpdateError } = await supabaseClient
        .from('saved_itineraries')
        .update({
          itinerary_content: generatedContent,
          title: destination,
          destination: destination,
          start_date: startDate ? startDate.split('T')[0] : null,
          end_date: endDate ? endDate.split('T')[0] : null,
          budget: budget,
          interests: interests ? interests.split(', ') : [],
          friend_recommendations: friendRecommendations || {}
        })
        .eq('id', itineraryId);

      if (directUpdateError) {
        console.log('Direct update failed, trying trips table:', directUpdateError);
        
        // Try updating in trips table for background-generated itineraries
        const { error: tripUpdateError } = await supabaseClient
          .from('trips')
          .update({
            description: generatedContent,
            title: destination,
            destination: destination,
            start_date: startDate ? startDate.split('T')[0] : null,
            end_date: endDate ? endDate.split('T')[0] : null,
            cost: budget ? `Budget Level ${budget}` : null
          })
          .eq('id', itineraryId);

        if (tripUpdateError) {
          console.error('Error updating trip record:', tripUpdateError);
        }
      }

      console.log('Itinerary regeneration completed successfully');
      return { success: true, content: generatedContent };

    } catch (error) {
      console.error('Error in background regeneration:', error);
      throw error;
    }
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth header
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData = await req.json();
    console.log('Edit request received for itinerary:', requestData.itineraryId);

    // Start background regeneration
    EdgeRuntime.waitUntil(regenerateItineraryBackground(requestData, authHeader, user.id));

    // Return immediate response
    return new Response(JSON.stringify({ 
      status: 'processing',
      destination: requestData.destination,
      message: 'Itinerary regeneration started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-itinerary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});