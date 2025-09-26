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
      itineraryContentLength: itineraryContent?.length,
      itineraryId: itineraryId
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

    // Validate required fields including itineraryId
    if (!itineraryId || itineraryId.trim() === '') {
      console.error('Missing itinerary ID');
      return new Response(JSON.stringify({
        error: 'Missing required fields: itineraryId',
        details: 'Itinerary ID is required'
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
    
    // Analyze the edit request type
    const editRequestLower = editRequest.toLowerCase();
    const isExtendingTrip = editRequestLower.includes('days longer') || editRequestLower.includes('add') && (editRequestLower.includes('days') || editRequestLower.includes('day'));
    const isShorteningTrip = editRequestLower.includes('days shorter') || editRequestLower.includes('shorter') || editRequestLower.includes('remove') && (editRequestLower.includes('days') || editRequestLower.includes('day'));
    
    const dayExtension = editRequestLower.match(/(\d+)\s*days?\s*longer/) || editRequestLower.match(/add\s*(\d+)\s*days?/) || editRequestLower.match(/make\s*it\s*(\d+)\s*days?\s*longer/);
    const dayReduction = editRequestLower.match(/(\d+)\s*days?\s*shorter/) || editRequestLower.match(/remove\s*(\d+)\s*days?/) || editRequestLower.match(/make\s*it\s*(\d+)\s*days?\s*shorter/);
    
    const numberOfDaysToAdd = dayExtension ? parseInt(dayExtension[1]) : 0;
    const numberOfDaysToRemove = dayReduction ? parseInt(dayReduction[1]) : 0;

    // Construct prompt for OpenAI - focus on targeted editing
    const conversationContext = conversationHistory && conversationHistory.length > 0 
      ? conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n\n')
      : '';

    let prompt;
    
    if (isExtendingTrip && numberOfDaysToAdd > 0) {
      // Special prompt for extending trips - just add the new days
      prompt = `
You are a travel expert. Take this EXISTING itinerary and add ${numberOfDaysToAdd} more day(s) to the end.

CURRENT COMPLETE ITINERARY:
${itineraryContent}

USER REQUEST: ${editRequest}

CRITICAL INSTRUCTIONS:
1. COPY the entire existing itinerary EXACTLY as written above
2. Add ${numberOfDaysToAdd} new day(s) at the very end following the same format
3. Keep ALL existing sections: Trip Summary, Getting There, Perfect Stay, Day-by-Day Itinerary, Travel Tips, Booking Links
4. Do NOT rewrite or modify ANY existing content
5. Only ADD new days at the end
6. Remove all ** markdown formatting
7. Keep bullet points as • characters

Return the COMPLETE itinerary with the new days appended.`;
    } else if (isShorteningTrip && numberOfDaysToRemove > 0) {
      // Special prompt for shortening trips - just remove the last days
      prompt = `
You are a travel expert. Take this EXISTING itinerary and remove the last ${numberOfDaysToRemove} day(s).

CURRENT COMPLETE ITINERARY:
${itineraryContent}

USER REQUEST: ${editRequest}

CRITICAL INSTRUCTIONS:
1. COPY the entire existing itinerary EXACTLY as written above
2. Remove only the last ${numberOfDaysToRemove} day(s) from the Day-by-Day section
3. Keep ALL other sections unchanged: Trip Summary, Getting There, Perfect Stay, Travel Tips, Booking Links
4. Do NOT rewrite or modify ANY other content
5. Remove all ** markdown formatting
6. Keep bullet points as • characters

Return the COMPLETE itinerary with the last ${numberOfDaysToRemove} day(s) removed.`;
    } else {
      // For other edits, be extremely conservative
      prompt = `
You are a travel expert. Make ONLY the specific requested change to this itinerary while preserving ALL other content.

CURRENT COMPLETE ITINERARY:
${itineraryContent}

USER REQUEST: ${editRequest}

CRITICAL INSTRUCTIONS:
1. COPY the entire existing itinerary structure EXACTLY
2. Keep ALL sections: Trip Summary, Getting There, Perfect Stay, Day-by-Day Itinerary, Travel Tips, Booking Links
3. Make ONLY the minimal change requested (e.g., add sports activities, make more luxurious, etc.)
4. For "sports activities" - insert sports options into existing days where appropriate
5. For "more luxurious" - upgrade only hotel/restaurant recommendations while keeping structure
6. Do NOT rewrite the entire itinerary
7. Do NOT change the overall structure or format
8. Remove all ** markdown formatting
9. Keep bullet points as • characters
10. Preserve all existing activities and just enhance them or add to them

Return the COMPLETE itinerary with your minimal targeted changes applied.`;
    }

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
    let editedContent = data.choices[0].message.content;
    
    // Clean up any remaining markdown formatting issues
    editedContent = editedContent
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markdown
      .replace(/^#+\s+/gm, '')          // Remove markdown headers
      .trim();

    console.log('Generated AI response');

    // Create service client for database operations first (needed for date calculations)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

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

    // Handle date updates for trip extensions and reductions
    if ((isExtendingTrip && numberOfDaysToAdd > 0) || (isShorteningTrip && numberOfDaysToRemove > 0)) {
      const daysChange = isExtendingTrip ? numberOfDaysToAdd : -numberOfDaysToRemove;
      const action = isExtendingTrip ? 'extending' : 'shortening';
      console.log(`Processing trip ${action}: ${Math.abs(daysChange)} days`);
      
      // Get current dates from database first
      let currentStartDate = null;
      let currentEndDate = null;
      
      // Try to get from saved_itineraries first
      const { data: savedIter } = await supabaseService
        .from('saved_itineraries')
        .select('start_date, end_date')
        .eq('id', itineraryId)
        .single();
      
      if (savedIter) {
        currentStartDate = savedIter.start_date;
        currentEndDate = savedIter.end_date;
      } else {
        // Try trips table
        const { data: tripData } = await supabaseService
          .from('trips')
          .select('start_date, end_date')
          .eq('id', itineraryId)
          .single();
        
        if (tripData) {
          currentStartDate = tripData.start_date;
          currentEndDate = tripData.end_date;
        }
      }
      
      console.log('Current dates from database:', { currentStartDate, currentEndDate });
      
      if (currentEndDate) {
        try {
          const endDate = new Date(currentEndDate);
          if (!isNaN(endDate.getTime())) {
            const newEndDate = new Date(endDate);
            newEndDate.setDate(newEndDate.getDate() + daysChange);
            updatedEndDate = newEndDate.toISOString().split('T')[0];
            updatedStartDate = currentStartDate; // Keep the same start date
            console.log(`${isExtendingTrip ? 'Extended' : 'Shortened'} trip by ${Math.abs(daysChange)} days. New dates: ${updatedStartDate} to ${updatedEndDate}`);
          }
        } catch (error) {
          console.error('Error calculating new end date:', error);
        }
      } else {
        console.warn('No current end date found in database for trip modification');
      }
    } else {
      // Extract dates if mentioned in the response (for other types of edits)
      const datePattern = /(\d{4}-\d{2}-\d{2})/g;
      const datesInResponse = editedContent.match(datePattern);
      if (datesInResponse && datesInResponse.length >= 2) {
        updatedStartDate = datesInResponse[0];
        updatedEndDate = datesInResponse[datesInResponse.length - 1];
      }
    }

    // Save the edited content back to the database
    console.log('Saving edited content to database...');
    console.log('Itinerary ID:', itineraryId);
    console.log('User ID:', user.id);
    console.log('Updated content length:', editedContent.length);
    
    // First, determine which table contains this itinerary
    let updateSuccess = false;
    let finalError = null;

    // Try to update in saved_itineraries table first
    console.log('Attempting to update saved_itineraries table...');
    const { data: savedIterResult, error: updateError1 } = await supabaseService
      .from('saved_itineraries')
      .update({
        itinerary_content: editedContent,
        destination: updatedDestination,
        start_date: updatedStartDate,
        end_date: updatedEndDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .select();

    if (updateError1) {
      console.log('Error updating saved_itineraries:', updateError1.message);
      finalError = updateError1;
    } else if (savedIterResult && savedIterResult.length > 0) {
      console.log('Successfully updated saved_itineraries table, rows affected:', savedIterResult.length);
      console.log('Updated saved_itineraries data:', JSON.stringify(savedIterResult[0], null, 2));
      updateSuccess = true;
    } else {
      console.log('No rows updated in saved_itineraries (no matching record found), trying trips table...');
    }

    // If saved_itineraries update didn't work, try trips table
    if (!updateSuccess) {
      console.log('Attempting to update trips table...');
      const { data: tripsResult, error: updateError2 } = await supabaseService
        .from('trips')
        .update({
          description: editedContent,
          destination: updatedDestination,
          start_date: updatedStartDate,
          end_date: updatedEndDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', itineraryId)
        .eq('user_id', user.id)
        .select();

      if (updateError2) {
        console.error('Error updating trips table:', updateError2.message);
        finalError = updateError2;
      } else if (tripsResult && tripsResult.length > 0) {
        console.log('Successfully updated trips table, rows affected:', tripsResult.length);
        console.log('Updated trips data:', JSON.stringify(tripsResult[0], null, 2));
        updateSuccess = true;
      } else {
        console.log('No rows updated in trips table either (no matching record found)');
      }
    }

    // If neither update worked, throw an error
    if (!updateSuccess) {
      console.error('Failed to update itinerary in either table:', finalError);
      throw new Error(`Failed to save changes: ${finalError?.message || 'No rows updated in either table - itinerary not found'}`);
    }

    console.log('Successfully saved edited content to database');

    // Generate a brief confirmation message based on the edit type
    let confirmationMessage;
    if (isExtendingTrip && numberOfDaysToAdd > 0) {
      confirmationMessage = `I'm making your trip ${numberOfDaysToAdd} day${numberOfDaysToAdd > 1 ? 's' : ''} longer. Check your itinerary for the updated journey!`;
    } else if (isShorteningTrip && numberOfDaysToRemove > 0) {
      confirmationMessage = `I'm making your trip ${numberOfDaysToRemove} day${numberOfDaysToRemove > 1 ? 's' : ''} shorter. Check your itinerary for the updated journey!`;
    } else if (editRequestLower.includes('budget')) {
      confirmationMessage = "I've updated your itinerary with budget-friendly options. Check your itinerary for the changes!";
    } else if (editRequestLower.includes('add') && !editRequestLower.includes('day')) {
      confirmationMessage = "I've added the requested activities to your itinerary. Check it out for the updates!";
    } else if (editRequestLower.includes('relax')) {
      confirmationMessage = "I've made your itinerary more relaxing. Check your updated journey!";
    } else {
      confirmationMessage = "I've updated your itinerary based on your request. Check it out for the changes!";
    }

    // Return response with brief confirmation
    return new Response(JSON.stringify({
      response: confirmationMessage,
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