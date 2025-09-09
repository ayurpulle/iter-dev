import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itineraryContent, editRequest, destination, conversationHistory } = await req.json();
    
    console.log('Edit request received:', {
      destination,
      editRequest: editRequest.substring(0, 100) + '...',
      conversationLength: conversationHistory.length
    });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are an expert travel itinerary assistant with access to comprehensive travel data including saved itineraries, user posts, and friend recommendations.

CORE CAPABILITIES:
- Edit and enhance existing travel itineraries
- Understand context from travel requests, even brief ones like "more luxury", "different", "extend", "shorter"
- Access to user's saved travel experiences and preferences
- Friend recommendations and travel tips from the community

GUIDELINES:
1. Interpret travel-related requests flexibly - "more luxury" means upgrade hotels/restaurants/experiences, "different" means suggest alternatives, etc.
2. When editing itineraries, maintain structure but enhance content based on the request
3. Use the provided travel data and context to make informed suggestions
4. If destination changes, update all location references throughout
5. For brief requests, infer intent from context (luxury = higher-end options, different = alternatives, etc.)
6. Always respond with either:
   - "UPDATED_ITINERARY:" followed by the revised content if changes are made
   - "EXPLANATION:" followed by details if no content update is needed
7. If destination changes, include "NEW_DESTINATION:" on a separate line before content

Current itinerary for ${destination}:
${itineraryContent}`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, response.statusText, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response received, length:', aiResponse.length);

    // Check if the response contains an updated itinerary
    let updatedItinerary = null;
    let newDestination = null;
    let explanation = aiResponse;

    if (aiResponse.startsWith('UPDATED_ITINERARY:')) {
      const content = aiResponse.replace('UPDATED_ITINERARY:', '').trim();
      
      // Check if there's a new destination specified
      if (content.startsWith('NEW_DESTINATION:')) {
        const lines = content.split('\n');
        newDestination = lines[0].replace('NEW_DESTINATION:', '').trim();
        updatedItinerary = lines.slice(1).join('\n').trim();
      } else {
        updatedItinerary = content;
      }
      
      explanation = `I've updated your itinerary based on your request: "${editRequest}"`;
      if (newDestination) {
        explanation += ` The destination has been changed to ${newDestination}.`;
      }
    } else if (aiResponse.startsWith('EXPLANATION:')) {
      explanation = aiResponse.replace('EXPLANATION:', '').trim();
    }

    // If we have an updated itinerary, we need to save it to the database
    if (updatedItinerary) {
      console.log('Updating itinerary in database...', { newDestination });
      
      // Create a Supabase client for server-side operations
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get the authorization header from the request
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('No authorization header found');
      }

      // Extract the token and get the user
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        throw new Error('Invalid authentication token');
      }

      // Find the itinerary to update - try multiple approaches
      let itinerary = null;
      
      // First try to find by destination and partial content match
      const { data: itinerariesByDest, error: fetchError1 } = await supabase
        .from('saved_itineraries')
        .select('id, user_id')
        .eq('destination', destination)
        .eq('user_id', user.id); // Only look at user's own itineraries for now

      if (fetchError1) {
        console.error('Error fetching itinerary by destination:', fetchError1);
      }

      if (itinerariesByDest && itinerariesByDest.length > 0) {
        // If multiple, try to find exact content match
        const exactMatch = itinerariesByDest.find(async (iter) => {
          const { data: fullIter } = await supabase
            .from('saved_itineraries')
            .select('itinerary_content')
            .eq('id', iter.id)
            .single();
          return fullIter?.itinerary_content === itineraryContent;
        });
        
        itinerary = exactMatch || itinerariesByDest[0]; // Use exact match or first one
      }

      if (!itinerary) {
        // Try a broader search - find by user and destination only
        const { data: userItineraries, error: fetchError2 } = await supabase
          .from('saved_itineraries')
          .select('id, user_id, title')
          .eq('user_id', user.id)
          .ilike('destination', `%${destination}%`);

        if (userItineraries && userItineraries.length > 0) {
          itinerary = userItineraries[0];
          console.log('Found itinerary by broader search:', itinerary);
        }
      }

      if (!itinerary) {
        console.error('No itinerary found for user:', user.id, 'destination:', destination);
        throw new Error('Itinerary not found - you may not have permission to edit this itinerary');
      }

      // Since we already filtered by user_id, we know they can edit it
      console.log('User has permission to edit itinerary:', itinerary.id);

      // Prepare update data
      const updateData: any = {
        itinerary_content: updatedItinerary,
        updated_at: new Date().toISOString()
      };

      // If destination changed, update it and the title
      if (newDestination && newDestination !== destination) {
        updateData.destination = newDestination;
        updateData.title = newDestination; // Update title to match new destination
      }

      // Update the itinerary
      const { error: updateError } = await supabase
        .from('saved_itineraries')
        .update(updateData)
        .eq('id', itinerary.id);

      if (updateError) {
        console.error('Error updating itinerary:', updateError);
        throw new Error('Failed to update itinerary');
      }

      console.log('Itinerary updated successfully');
    }

    return new Response(JSON.stringify({
      response: explanation,
      updatedItinerary: updatedItinerary,
      newDestination: newDestination,
      hasUpdate: !!updatedItinerary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-itinerary function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});