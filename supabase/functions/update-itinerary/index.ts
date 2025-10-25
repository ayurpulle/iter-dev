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

**CRITICAL: PRESERVE ALL RECOMMENDATION MARKERS**
When friend recommendations are present, you MUST include [FRIEND_REC:VenueName] markers immediately after the venue name in the text.
When web recommendations are present, you MUST include [WEB_REC:VenueName:URL] markers with the full URL immediately after the venue name.
Example: "Visit Blue Bottle Coffee [FRIEND_REC:Blue Bottle Coffee] for breakfast"
Example: "Dine at Gary Danko [WEB_REC:Gary Danko:https://example.com]"

**Required Format:**
Structure your response with these exact sections:

**Trip Summary**
[2-3 sentences describing the updated trip overview, highlighting what makes this itinerary special]

**Getting There**
[Transportation recommendations in bullet points]
• Flight recommendations and booking tips
• Airport transfer options
• Entry requirements and documentation
[Keep concise and actionable]

**Perfect Stay**
[Accommodation recommendations in bullet points]
• **Budget:** [hotel with details]
• **Mid-Range:** [hotel with details]
• **Luxury:** [hotel with details]
• **Best Neighborhoods:** [neighborhood recommendations]
• **Booking Tips:** [timing and booking advice]
[Keep concise and organized]

**Day-by-Day Itinerary**
[IMPORTANT: Follow day grouping rules:
- For trips ≤7 days: Use "Day 1:", "Day 2:", etc.
- For trips 7-14 days: Group as "Days 1-2:", "Days 3-4:", etc.
- For trips >14 days: Group by weeks "Week 1:", "Week 2:", etc.]

For EACH day, use this EXACT structure (critical for parsing):
**Day 1: [Day Title]**

• Morning:
• Activity with brief description
• Activity with brief description

• Afternoon:
• Activity with brief description
• Activity with brief description

• Evening:
• Activity with brief description

• Night:
• Activity or note about nighttime

[Use bullet points • for all activities]

**Travel Tips**
[Practical advice in bullet points]
• **Local Customs:** [etiquette tips]
• **Transportation:** [getting around advice]
• **Money:** [payment and currency tips]
• **What to Pack:** [essential items]
• **Safety:** [safety considerations]
• **Best Times:** [optimal visiting times]
[Keep concise and actionable]

**Booking Links**
[Relevant booking recommendations in bullet points]
• Flight and accommodation booking tips
• Activity reservation recommendations
• Useful booking platforms or services

**FORMATTING REQUIREMENTS:**
1. Use section headers: **Trip Summary**, **Getting There**, **Perfect Stay**, **Day-by-Day Itinerary**, **Travel Tips**, **Booking Links**
2. Use bullet points • for all lists
3. Day structure CRITICAL: **Day X: [Title]** followed by time periods with bullet points
4. For sub-sections use **Bold:** for headers like **Budget:**, **Local Customs:**, etc.
5. Embed all URLs as markdown hyperlinks: [Link Text](URL), never show raw URLs
6. PRESERVE all [FRIEND_REC:VenueName] and [WEB_REC:VenueName:URL] markers
7. Keep tone conversational but informative
8. Include specific venue names and practical details

Keep the same engaging, personal tone while updating the content to match the new parameters. Include specific recommendations that align with the specified budget and interests.
`;

    console.log('Calling OpenAI API for itinerary regeneration...');
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
            content: "You are an expert travel planner who creates detailed, personalized itineraries. CRITICAL: Write in natural, conversational language - NOT like AI-generated content. Use simple, direct sentences after bullet points. Keep descriptions concise and human-sounding. Avoid flowery or overly enthusiastic language. Write like you're texting travel advice to a friend. Always follow the exact format requested with bullet points for all sections and provide specific, actionable recommendations with proper day grouping based on trip duration. IMPORTANT: For all links, use markdown format [Name](URL) with NO SPACES between brackets and parentheses, and NO SPACES in URLs."
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
        data: { itinerary_id: requestData.itineraryId, error: (error as Error)?.message || 'Unknown error' }
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
      supabaseAnonKey: !!supabaseAnonKey
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
    // EdgeRuntime.waitUntil(
    //   regenerateItineraryBackground(requestData, authHeader, user.id)
    // );

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
      error: (error as Error)?.message || 'Unknown error',
      details: 'Failed to start itinerary update process'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});