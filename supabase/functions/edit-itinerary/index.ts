import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Parse the request body
    const { itineraryContent, editRequest, destination, conversationHistory } = await req.json();
    
    console.log('Received edit request:', {
      editRequest,
      destination,
      userId: user.id
    });

    // Validate required fields
    if (!itineraryContent || !editRequest || !destination) {
      throw new Error('Missing required fields: itineraryContent, editRequest, or destination');
    }

    // Construct prompt for OpenAI
    const conversationContext = conversationHistory && conversationHistory.length > 0 
      ? conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n\n')
      : '';

    const prompt = `
You are a travel expert helping to edit and improve a travel itinerary. Here's the current itinerary for ${destination}:

CURRENT ITINERARY:
${itineraryContent}

CONVERSATION HISTORY:
${conversationContext}

USER REQUEST:
${editRequest}

Please respond conversationally to the user's request. If they want to modify the itinerary, provide the updated version. If they just want information or suggestions, provide a helpful response.

If you're updating the itinerary, please maintain the same structure:
- **Trip Summary**
- **Getting There**
- **Perfect Stay**
- **Day-by-Day Itinerary**
- **Travel Tips**
- **Booking Links**

Be helpful, personable, and focus on what the user specifically asked for.
`;

    console.log('Calling OpenAI API for itinerary editing...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful travel expert who can edit and improve travel itineraries based on user feedback. Be conversational and helpful.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Generated AI response');

    // Check if the response contains a complete itinerary (has the key sections)
    const hasItineraryStructure = aiResponse.includes('**Trip Summary**') || 
                                 aiResponse.includes('**Getting There**') || 
                                 aiResponse.includes('**Day-by-Day Itinerary**');

    let updatedItinerary = null;
    let newDestination = null;

    if (hasItineraryStructure) {
      updatedItinerary = aiResponse;
      
      // Check if destination changed in the new itinerary
      const destinationMatch = aiResponse.match(/(?:destination|visiting|trip to|traveling to)[:\s]*([^.\n]+)/i);
      if (destinationMatch && destinationMatch[1] && destinationMatch[1].trim() !== destination) {
        newDestination = destinationMatch[1].trim();
      }
    }

    // Return response
    return new Response(JSON.stringify({
      response: aiResponse,
      updatedItinerary,
      newDestination
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-itinerary function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Failed to edit itinerary'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});