import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface RegenerateItineraryData {
  itineraryId: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  interests?: string;
  travelStyle?: string;
  ragContext?: string;
  friendRecommendations?: any;
  currentContent: string;
}

async function regenerateItineraryBackground(requestData: RegenerateItineraryData, authHeader: string, userId: string) {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user profile for currency and base location
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_currency, base_location')
      .eq('user_id', userId)
      .single();

    const userCurrency = profile?.default_currency || 'USD';
    const userLocation = profile?.base_location || 'United States';

    // Calculate trip duration
    let duration = '';
    if (requestData.startDate && requestData.endDate) {
      const start = new Date(requestData.startDate);
      const end = new Date(requestData.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      duration = `${days} day${days !== 1 ? 's' : ''}`;
    }

    // Construct detailed prompt for OpenAI
    const prompt = `
You are a travel expert creating a detailed, personalized itinerary. Generate a comprehensive travel itinerary with the following specifications:

**Core Requirements:**
- Destination: ${requestData.destination}
- Duration: ${duration || 'Flexible duration'}
- Budget Level: ${requestData.budget ? '$'.repeat(requestData.budget) : '$$$'} (1=budget, 5=ultra-luxury)
- Travel Interests: ${requestData.interests || 'General travel'}
- Travel Style: ${requestData.travelStyle || 'Balanced exploration'}
- User Base Location: ${userLocation}
- Preferred Currency: ${userCurrency}

**Additional Context:**
${requestData.ragContext || 'No additional context provided'}

**Friend Recommendations:**
${JSON.stringify(requestData.friendRecommendations || {}, null, 2)}

**Current Itinerary to Update:**
${requestData.currentContent}

**Instructions:**
Please update and enhance the existing itinerary based on the new parameters provided above. Maintain the same structure but update:
1. Dates and duration if changed
2. Budget-appropriate recommendations if budget level changed
3. Activities and recommendations if interests changed
4. Overall tone and recommendations to match the travel style

**Required Format:**
Structure your response with these exact sections:

**Trip Summary**
[2-3 sentences describing the updated trip overview, highlighting what makes this itinerary special for the specified interests and budget level]

**Getting There**
[Transportation recommendations including flights, airport transfers, and arrival logistics]

**Perfect Stay**
[Accommodation recommendations that match the budget level and location preferences]

**Day-by-Day Itinerary**
[IMPORTANT: Follow day grouping rules:
- For trips ≤7 days: Use "Day 1:", "Day 2:", etc.
- For trips 7-14 days: Group as "Days 1-2:", "Days 3-4:", etc.
- For trips >14 days: Group by weeks "Week 1:", "Week 2:", etc.]

**Travel Tips**
[Practical advice specific to the destination, budget level, and travel style]

**Booking Links**
[Relevant booking recommendations and tips for reservations]

FORMATTING REQUIREMENTS:
- Create a unique, engaging Trip Summary (not formulaic)
- Use clean formatting without asterisks around single words like *night* - use **night** for bold instead
- Keep tone casual but helpful with good grammar
- Follow day grouping rules based on trip duration

Keep the same engaging, personal tone while updating the content to match the new parameters. Include specific recommendations for restaurants, activities, and experiences that align with the specified budget and interests.
`;

    console.log('Calling OpenAI API for itinerary regeneration...');
    
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
            content: 'You are an expert travel planner who creates detailed, personalized itineraries. Always follow the exact format requested and provide specific, actionable recommendations with proper day grouping based on trip duration.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated itinerary content, updating database...');

    // Update the itinerary in the appropriate table
    // First try saved_itineraries, then trips if not found
    const { error: updateError1 } = await supabase
      .from('saved_itineraries')
      .update({
        itinerary_content: generatedContent,
        destination: requestData.destination,
        start_date: requestData.startDate || null,
        end_date: requestData.endDate || null,
        budget: requestData.budget || null,
        interests: requestData.interests ? requestData.interests.split(', ') : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestData.itineraryId)
      .eq('user_id', userId);

    // If update to saved_itineraries failed, try trips table
    if (updateError1) {
      console.log('Saved itinerary not found, trying trips table...');
      const { error: updateError2 } = await supabase
        .from('trips')
        .update({
          description: generatedContent,
          destination: requestData.destination,
          start_date: requestData.startDate || null,
          end_date: requestData.endDate || null,
          cost: requestData.budget ? '$'.repeat(requestData.budget) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestData.itineraryId)
        .eq('user_id', userId);

      if (updateError2) {
        throw new Error(`Failed to update itinerary: ${updateError2.message}`);
      }
    }

    console.log('Itinerary regeneration completed successfully');

    // Send notification to user using direct database insert
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'itinerary_updated',
        title: 'Itinerary Updated',
        message: `Your ${requestData.destination} itinerary has been successfully updated!`,
        data: { itinerary_id: requestData.itineraryId }
      });

  } catch (error) {
    console.error('Error in regenerateItineraryBackground:', error);
    
    // Create error notification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'system_message',
        title: 'Itinerary Update Failed',
        message: `Failed to update your ${requestData.destination} itinerary. Please try again.`,
        data: { itinerary_id: requestData.itineraryId, error: error.message }
      });
  }
}

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
    const requestData: RegenerateItineraryData = await req.json();
    
    console.log('Received itinerary update request:', {
      itineraryId: requestData.itineraryId,
      destination: requestData.destination,
      userId: user.id
    });

    // Validate required fields
    if (!requestData.itineraryId || !requestData.destination || !requestData.currentContent) {
      throw new Error('Missing required fields: itineraryId, destination, or currentContent');
    }

    // Start background processing
    EdgeRuntime.waitUntil(
      regenerateItineraryBackground(requestData, authHeader, user.id)
    );

    // Return immediate response
    return new Response(JSON.stringify({
      status: 'processing',
      message: 'Itinerary update started in background',
      destination: requestData.destination
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-itinerary function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Failed to start itinerary update process'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});