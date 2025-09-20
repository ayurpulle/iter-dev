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
    console.log('Edit itinerary function called');
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('No authorization header');
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    console.log('Supabase URL and anon key present:', !!supabaseUrl, !!supabaseAnonKey);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    console.log('Attempting to get user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth result:', { user: !!user, authError: authError?.message });
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`);
    }

    // Parse the request body
    const requestBody = await req.json();
    const { itineraryContent, editRequest, destination, conversationHistory, budget, interests, travelStyle } = requestBody;
    
    console.log('Received edit request:', {
      editRequest,
      destination,
      budget,
      interests,
      travelStyle,
      userId: user.id,
      fullBody: requestBody
    });

    // Validate required fields
    if (!itineraryContent || !editRequest || !destination) {
      console.error('Validation failed:', { itineraryContent: !!itineraryContent, editRequest: !!editRequest, destination: !!destination });
      throw new Error('Missing required fields: itineraryContent, editRequest, or destination');
    }

    // Calculate trip duration for proper day grouping
    const calculateDayGrouping = (content: string) => {
      const dayMatches = content.match(/(?:Day|Days)\s+\d+/gi);
      if (!dayMatches) return 'day-by-day';
      
      const maxDay = Math.max(...dayMatches.map(match => {
        const numbers = match.match(/\d+/g);
        return numbers ? parseInt(numbers[numbers.length - 1]) : 1;
      }));
      
      if (maxDay <= 7) return 'day-by-day';
      if (maxDay <= 14) return '2-3-days';
      return 'weekly';
    };

    const currentGrouping = calculateDayGrouping(itineraryContent);

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

ORIGINAL TRIP PARAMETERS:
- Budget Level: ${budget ? '$'.repeat(budget) : 'Not specified'} (1=budget, 5=ultra-luxury)
- Travel Interests: ${interests || 'General travel'}
- Travel Style: ${travelStyle || 'Balanced exploration'}

IMPORTANT FORMATTING RULES:
1. For trips ≤7 days: Use "Day 1:", "Day 2:", etc. for each day
2. For trips 7-14 days: Group into "Days 1-2:", "Days 3-4:", etc.
3. For trips >14 days: Group by weeks "Week 1:", "Week 2:", etc.
4. Use clean formatting without asterisks around words like *night* - use **night** for bold instead
5. Create an engaging, personalized Trip Summary (not formulaic)
6. Keep tone casual but helpful with good grammar
7. Ensure all recommendations match the specified budget level and travel interests

If you're updating the itinerary, maintain this structure:
- **Trip Summary** (Generate a unique, engaging 2-3 sentence summary)
- **Getting There**
- **Perfect Stay**
- **Day-by-Day Itinerary** (or grouped days based on duration)
- **Travel Tips**
- **Booking Links**

When making changes, consider the original budget and travel interests to ensure consistency. Respond conversationally and focus on what the user specifically asked for. If extending trip duration, adjust the day grouping accordingly.
`;

    console.log('Calling OpenAI API for itinerary editing...');
    console.log('OpenAI API key present:', !!openAIApiKey);
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
            content: 'You are a helpful travel expert who can edit and improve travel itineraries based on user feedback. Be conversational and helpful. Always provide structured itineraries with proper day grouping and consistent formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 3000,
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
                                 aiResponse.includes('**Day-by-Day Itinerary**') ||
                                 aiResponse.includes('Day 1') ||
                                 aiResponse.includes('Days 1') ||
                                 aiResponse.includes('Week 1');

    let updatedItinerary = null;
    let newDestination = null;

    if (hasItineraryStructure) {
      updatedItinerary = aiResponse;
      
      // Extract trip duration changes to update destination if needed
      const dayMatches = aiResponse.match(/(?:Day|Days)\s+\d+/gi);
      let maxDay = 1;
      if (dayMatches) {
        maxDay = Math.max(...dayMatches.map(match => {
          const numbers = match.match(/\d+/g);
          return numbers ? parseInt(numbers[numbers.length - 1]) : 1;
        }));
      }
      
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
      status: 200,
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