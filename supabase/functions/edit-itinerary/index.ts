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

    // Extract current metadata from the itinerary
    const extractCurrentMetadata = (content: string) => {
      const dateMatch = content.match(/Dates:\s*([^\\n]+)/i);
      const airportMatch = content.match(/Airports:\s*([^\\n]+)/i);
      const typeMatch = content.match(/Type:\s*([^\\n]+)/i);
      const budgetMatch = content.match(/Budget:\s*([^\\n]+)/i);
      
      return {
        dates: dateMatch ? dateMatch[1].trim() : null,
        airports: airportMatch ? airportMatch[1].trim() : null,
        type: typeMatch ? typeMatch[1].trim() : null,
        budgetDisplay: budgetMatch ? budgetMatch[1].trim() : null
      };
    };

    const currentMetadata = extractCurrentMetadata(itineraryContent);
    
    // Construct prompt for OpenAI - focus on targeted editing
    const conversationContext = conversationHistory && conversationHistory.length > 0 
      ? conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n\n')
      : '';

    const prompt = `
You are a travel expert helping to edit a travel itinerary. You must ALWAYS return a complete, properly structured itinerary while preserving essential metadata.

CURRENT ITINERARY:
${itineraryContent}

CONVERSATION HISTORY:
${conversationContext}

USER REQUEST:
${editRequest}

ORIGINAL TRIP PARAMETERS:
- Destination: ${destination}
- Budget Level: ${budget ? '$'.repeat(budget) : 'Not specified'} (1=budget, 5=ultra-luxury)
- Travel Interests: ${interests || 'General travel'}
- Travel Style: ${travelStyle || 'Balanced exploration'}

CURRENT METADATA TO PRESERVE:
- Current Dates: ${currentMetadata.dates || 'Not specified'}
- Current Airports: ${currentMetadata.airports || 'Not specified'}
- Current Holiday Type: ${currentMetadata.type || 'Not specified'}
- Current Budget Display: ${currentMetadata.budgetDisplay || 'Not specified'}

CRITICAL INSTRUCTIONS:
You MUST return a complete itinerary with these exact sections in this order.
IMPORTANT: Unless the user specifically asks to change dates, airports, holiday types, or budget, keep the existing metadata EXACTLY as it is.

First, include the existing metadata section EXACTLY as it appears in the current itinerary (unless user specifically requests changes to dates/airports/types/budget):

[Keep the existing trip summary, dates, airports, holiday types, and budget information EXACTLY as they currently appear]

Then provide these sections:

**Day-by-Day Itinerary**
[For each day, organize activities by time periods (Morning, Afternoon, Evening, Night) using bullet points]

**Getting There**
• Flight recommendations and booking tips
• Airport transfer options  
• Any travel documentation needed

**Perfect Stay**  
• Accommodation recommendations (3-4 options across different price points)
• Best neighborhoods to stay in
• Booking tips and timing

**Travel Tips**
• Local customs and etiquette
• Transportation within the destination  
• Money and payment tips
• What to pack
• Safety considerations
• Best times to visit attractions

**Booking & Tips**
• Direct links to recommended hotels
• Restaurant reservation information
• Attraction tickets and tours
• Transportation booking links

IMPORTANT: 
- Apply the user's requested changes to the appropriate sections
- PRESERVE the map/location pin, title, dates, airports, holiday types, and budget sections exactly as they are unless specifically asked to change them
- When recommending venues from saved posts, mark them with [SAVED_REC:venue_name:user_name]
- Include 1-2 internet-researched recommendations marked with [WEB_REC:venue_name:source_url]
- Use bullet points for all sections
- Keep descriptions concise but well-written
- Focus on experiences rather than rigid schedules
- Maintain the exact section structure shown above
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
            content: 'You are a helpful travel expert who creates complete, structured travel itineraries. Always provide the full itinerary with proper sections even when making edits.'
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

    // Always return the response as a complete itinerary since we're enforcing structure
    const updatedItinerary = aiResponse;
    let newDestination = null;
    let newStartDate = null;
    let newEndDate = null;

    // Extract destination changes
    const destinationMatch = aiResponse.match(/(?:destination|visiting|trip to|traveling to)[:\s]*([^.\n]+)/i);
    if (destinationMatch && destinationMatch[1] && destinationMatch[1].trim() !== destination) {
      newDestination = destinationMatch[1].trim();
    }

    // Handle date adjustments
    const { dateAdjustment } = requestBody;
    if (dateAdjustment && dateAdjustment !== 0) {
      // If date adjustment was requested, calculate new end date
      const currentEndDateMatch = itineraryContent.match(/end.*date[:\s]*([^\n]+)/i);
      if (currentEndDateMatch) {
        try {
          const currentEndDate = new Date(currentEndDateMatch[1]);
          const newEndDateObj = new Date(currentEndDate.getTime() + (dateAdjustment * 24 * 60 * 60 * 1000));
          newEndDate = newEndDateObj.toISOString().split('T')[0];
        } catch (e) {
          console.log('Could not parse date for adjustment');
        }
      }
    }

    // Return response
    return new Response(JSON.stringify({
      response: aiResponse,
      updatedItinerary,
      newDestination,
      newEndDate,
      newStartDate
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