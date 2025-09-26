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

    // Improved system message for clarity
    const systemMessage = `You are a travel itinerary editor. Your job is to modify travel itineraries based on user requests.

CRITICAL RULES:
1. ALWAYS output the COMPLETE itinerary, not just the changes
2. Your response should contain the FULL itinerary with ALL days and activities
3. Never summarize or abbreviate - include everything
4. The output should be immediately usable as a complete itinerary
5. Preserve the original structure and format
6. Apply edits surgically - change only what's requested
7. If adding days, append them to the end
8. If removing days, remove from the end
9. Never use markdown formatting in your response`;

    // For all edit types, use this more explicit prompt structure
    const prompt = `
You are editing a travel itinerary. Your response MUST contain the COMPLETE itinerary with edits applied.

CRITICAL INSTRUCTIONS:
1. ALWAYS return the FULL itinerary - every day, every activity, every section
2. NEVER return only changes or summaries
3. NEVER return partial content
4. If you're adding content, include ALL existing content PLUS the new additions
5. If you're modifying content, include ALL content with modifications applied
6. Your response should be AT LEAST as long as the original itinerary

CURRENT COMPLETE ITINERARY (${itineraryContent.length} characters):
"""
${itineraryContent}
"""

USER'S EDIT REQUEST:
"${editRequest}"

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}

${isExtendingTrip && numberOfDaysToAdd > 0 ? 
  `SPECIFIC INSTRUCTION: Add ${numberOfDaysToAdd} new day(s) at the end. Keep ALL existing days exactly as they are.` : ''}

${isShorteningTrip && numberOfDaysToRemove > 0 ? 
  `SPECIFIC INSTRUCTION: Remove the last ${numberOfDaysToRemove} day(s). Keep all other days exactly as they are.` : ''}

NOW PROVIDE THE COMPLETE EDITED ITINERARY:
- Include ALL days from the original
- Include ALL activities and recommendations
- Apply the requested edits while preserving everything else
- Use the same format as the original
- Remove markdown formatting (no **, no ##)
- Your response must be a complete, standalone itinerary

COMPLETE EDITED ITINERARY:`;

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
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 4000, // Increase to ensure full content
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

    // CRITICAL: Validate the edited content
    if (!editedContent || editedContent.length < 100) {
      console.error('LLM returned insufficient content:', editedContent);
      console.log('Falling back to original itinerary content with warning');
      
      // If LLM failed to return proper content, keep the original
      editedContent = itineraryContent;
      
      // Return error response to user
      return new Response(JSON.stringify({
        error: 'Failed to generate proper edits',
        details: 'The AI did not return a complete itinerary. Please try rephrasing your request.',
        response: 'I encountered an issue editing your itinerary. Please try again with a more specific request.',
        updatedItinerary: itineraryContent, // Return original content
        saved: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Additional validation: Check if content seems like a complete itinerary
    const hasBasicItineraryStructure = 
      editedContent.includes('Day') || 
      editedContent.includes('Morning') || 
      editedContent.includes('Afternoon') ||
      editedContent.includes('Evening');

    if (!hasBasicItineraryStructure) {
      console.error('LLM response lacks itinerary structure:', editedContent.substring(0, 200));
      
      // Try to recover by re-prompting with more explicit instructions
      const recoveryPrompt = `
The previous response was incomplete. Please provide the COMPLETE itinerary with ALL days and activities.

ORIGINAL COMPLETE ITINERARY:
${itineraryContent}

USER'S EDIT REQUEST:
${editRequest}

CRITICAL: Return the ENTIRE itinerary with the requested edits applied. Include ALL days, ALL sections, and ALL activities. Do not return only the changes or a summary.`;

      // Make another API call with clearer instructions
      const recoveryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You MUST return the complete travel itinerary with all days, activities, and sections. Never return partial content or only the changes.'
            },
            {
              role: 'user',
              content: recoveryPrompt
            }
          ],
          max_completion_tokens: 4000, // Increase token limit for recovery
        }),
      });

      if (recoveryResponse.ok) {
        const recoveryData = await recoveryResponse.json();
        editedContent = recoveryData.choices[0].message.content
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/^#+\s+/gm, '')
          .trim();
        
        // Check recovery attempt
        if (editedContent.length < 100) {
          // Recovery failed, return original
          console.error('Recovery attempt also failed');
          editedContent = itineraryContent;
        }
      } else {
        // Recovery API call failed, keep original
        editedContent = itineraryContent;
      }
    }

    // Log content length for debugging
    console.log('Final edited content length:', editedContent.length);
    console.log('Original content length:', itineraryContent.length);

    // Warn if edited content is significantly shorter than original
    if (editedContent.length < itineraryContent.length * 0.5) {
      console.warn('Edited content is significantly shorter than original. This might indicate an issue.');
      // But proceed if it has basic structure
      if (!hasBasicItineraryStructure) {
        editedContent = itineraryContent;
      }
    }

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