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
        content: `You are an expert travel itinerary editor. Your job is to modify travel itineraries based on user requests while maintaining the original structure and format.

Current itinerary for ${destination}:
${itineraryContent}

Guidelines:
1. Keep the same overall structure and formatting
2. Maintain day-by-day organization
3. When making changes, be specific and detailed
4. If the user asks for general improvements, suggest concrete additions
5. Always respond with either:
   - The UPDATED itinerary content if changes should be made
   - An explanation of the changes if no content update is needed
6. Start your response with either "UPDATED_ITINERARY:" followed by the new content, or "EXPLANATION:" followed by your explanation`
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
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response received, length:', aiResponse.length);

    // Check if the response contains an updated itinerary
    let updatedItinerary = null;
    let explanation = aiResponse;

    if (aiResponse.startsWith('UPDATED_ITINERARY:')) {
      updatedItinerary = aiResponse.replace('UPDATED_ITINERARY:', '').trim();
      explanation = `I've updated your itinerary based on your request: "${editRequest}"`;
    } else if (aiResponse.startsWith('EXPLANATION:')) {
      explanation = aiResponse.replace('EXPLANATION:', '').trim();
    }

    // If we have an updated itinerary, we need to save it to the database
    if (updatedItinerary) {
      console.log('Updating itinerary in database...');
      
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

      // Find the itinerary to update by matching the content
      const { data: itineraries, error: fetchError } = await supabase
        .from('saved_itineraries')
        .select('id, user_id')
        .eq('destination', destination)
        .eq('itinerary_content', itineraryContent);

      if (fetchError) {
        console.error('Error fetching itinerary:', fetchError);
        throw new Error('Failed to find itinerary to update');
      }

      if (!itineraries || itineraries.length === 0) {
        throw new Error('Itinerary not found');
      }

      const itinerary = itineraries[0];

      // Check if user has permission to edit this itinerary
      const { data: permissions } = await supabase
        .rpc('get_user_itinerary_permissions', {
          itinerary_uuid: itinerary.id,
          user_uuid: user.id
        });

      if (!permissions?.can_edit) {
        throw new Error('You do not have permission to edit this itinerary');
      }

      // Update the itinerary
      const { error: updateError } = await supabase
        .from('saved_itineraries')
        .update({
          itinerary_content: updatedItinerary,
          updated_at: new Date().toISOString()
        })
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