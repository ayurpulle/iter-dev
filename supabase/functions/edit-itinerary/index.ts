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
    const { itineraryContent, editRequest, destination, conversationHistory, budget, interests, travelStyle, itineraryId } = requestBody;
    
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
You are a travel expert helping to make TARGETED edits to an existing itinerary. Make ONLY the specific changes requested - do not regenerate the entire itinerary.

CURRENT ITINERARY:
${itineraryContent}

CONVERSATION HISTORY:
${conversationContext}

USER REQUEST:
${editRequest}

CRITICAL INSTRUCTIONS:
1. Make ONLY the specific changes requested - do not rewrite the entire itinerary
2. Keep all existing content that isn't being modified EXACTLY as is
3. Maintain the exact same format and structure
4. For extending trips: Add new days/activities to existing content
5. For budget changes: Update only price-related recommendations
6. For activity additions: Insert into appropriate existing days
7. For date changes: Update only date references
8. NEVER change destination unless explicitly requested with words like "change destination to" or "go to [place] instead"

EXAMPLES of targeted edits:
- "Add 1 day" → Insert new day content at the end, update duration if mentioned
- "Make it more budget-friendly" → Update only accommodation/restaurant recommendations
- "Add museum visit" → Insert museum activity into appropriate existing day
- "Make day 2 more relaxing" → Replace only day 2 activities with relaxing ones

Provide the complete updated itinerary with your targeted changes applied. Keep everything else EXACTLY the same.`;

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
    const editedContent = data.choices[0].message.content;

    console.log('Generated AI response');

    // Extract potential metadata changes from the response
    let updatedDestination = destination;
    let updatedStartDate = null;
    let updatedEndDate = null;

    // Only update destination if explicitly mentioned in the edit request with clear intent
    const destinationChangeKeywords = ['change destination to', 'go to', 'visit', 'travel to', 'instead of'];
    const editLower = editRequest.toLowerCase();
    const hasExplicitDestinationChange = destinationChangeKeywords.some(keyword => editLower.includes(keyword));
    
    if (hasExplicitDestinationChange) {
      const destinationMatch = editLower.match(/(?:change destination to|go to|visit|travel to|instead of)\s+([^.!?]+)/i);
      if (destinationMatch) {
        const extractedDest = destinationMatch[1].trim();
        if (extractedDest.length > 2 && extractedDest.length < 100) {
          updatedDestination = extractedDest;
        }
      }
    }

    // Extract dates if mentioned in the response
    const datePattern = /(\d{4}-\d{2}-\d{2})/g;
    const datesInResponse = editedContent.match(datePattern);
    if (datesInResponse && datesInResponse.length >= 2) {
      updatedStartDate = datesInResponse[0];
      updatedEndDate = datesInResponse[datesInResponse.length - 1];
    }

    // Save the edited content back to the database
    console.log('Saving edited content to database...');
    
    // Create service client for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to update in saved_itineraries table first
    const { error: updateError1 } = await supabaseService
      .from('saved_itineraries')
      .update({
        itinerary_content: editedContent,
        destination: updatedDestination,
        start_date: updatedStartDate,
        end_date: updatedEndDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', itineraryId)
      .eq('user_id', user.id);

    // If not found in saved_itineraries, try trips table
    if (updateError1) {
      console.log('Not found in saved_itineraries, trying trips table...');
      const { error: updateError2 } = await supabaseService
        .from('trips')
        .update({
          description: editedContent,
          destination: updatedDestination,
          start_date: updatedStartDate,
          end_date: updatedEndDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', itineraryId)
        .eq('user_id', user.id);

      if (updateError2) {
        console.error('Failed to update itinerary:', updateError2);
        throw new Error(`Failed to save changes: ${updateError2.message}`);
      }
    }

    console.log('Successfully saved edited content to database');

    // Return response
    return new Response(JSON.stringify({
      response: editedContent,
      updatedItinerary: editedContent,
      newDestination: updatedDestination !== destination ? updatedDestination : null,
      newEndDate: updatedEndDate,
      newStartDate: updatedStartDate,
      saved: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-itinerary function:', error);
    return new Response(JSON.stringify({
      error: (error as Error)?.message || 'Unknown error',
      details: 'Failed to edit itinerary'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});