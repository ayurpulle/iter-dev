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
    console.log('Authorization header value:', authHeader?.substring(0, 20) + '...');
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(JSON.stringify({
        error: 'Auth session missing!',
        details: 'No authorization header provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Environment variables:', { 
      supabaseUrl: !!supabaseUrl, 
      supabaseAnonKey: !!supabaseAnonKey,
      openAIApiKey: !!openAIApiKey
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get the current user using the JWT from the authorization header
    console.log('Attempting to get user...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('Auth result:', { 
      user: !!user, 
      userId: user?.id, 
      authError: authError?.message,
      authErrorCode: authError?.status
    });
    
    if (authError) {
      console.error('Authentication error details:', authError);
      return new Response(JSON.stringify({
        error: 'Auth session missing!',
        details: `Authentication failed: ${authError.message}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.error('No user found in token');
      return new Response(JSON.stringify({
        error: 'Auth session missing!',
        details: 'No user found in session'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      hasItineraryContent: !!itineraryContent,
      itineraryContentLength: itineraryContent?.length
    });

    // Validate required fields
    if (!itineraryContent || itineraryContent.trim() === '') {
      console.error('Missing itinerary content');
      return new Response(JSON.stringify({
        error: 'Missing required fields: itineraryContent',
        details: 'Itinerary content is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!editRequest || editRequest.trim() === '') {
      console.error('Missing edit request');
      return new Response(JSON.stringify({
        error: 'Missing required fields: editRequest',
        details: 'Edit request is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!destination || destination.trim() === '') {
      console.error('Missing destination');
      return new Response(JSON.stringify({
        error: 'Missing required fields: destination',
        details: 'Destination is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Construct prompt for OpenAI - focus on targeted editing
    const conversationContext = conversationHistory && conversationHistory.length > 0 
      ? conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n\n')
      : '';

    const prompt = `
You are a travel expert helping to make specific edits to a travel itinerary. 

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

IMPORTANT INSTRUCTIONS:
1. DO NOT regenerate the entire itinerary unless specifically asked
2. Make targeted edits based ONLY on what the user requested
3. If the user asks to add something, add it to the appropriate section
4. If the user asks to change something specific, only change that part
5. If the user asks about alternatives, suggest them without rewriting everything
6. Keep the existing structure and formatting
7. Be conversational in your response - explain what you're changing and why

For responses that don't require a full itinerary update, just respond conversationally with suggestions or specific changes. Only provide a complete updated itinerary if the user explicitly asks for major restructuring or you're making substantial changes that affect multiple sections.

Focus on being helpful and specific to their request rather than comprehensive.
`;

    console.log('Calling OpenAI API for itinerary editing...');
    console.log('OpenAI API key present:', !!openAIApiKey);
    
    if (!openAIApiKey) {
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        details: 'Server configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({
        error: `OpenAI API error: ${error}`,
        details: 'Failed to generate response'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      error: error.message || 'Unknown error',
      details: 'Failed to edit itinerary'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});