import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { locationName } = await req.json()
    
    if (!locationName) {
      throw new Error('Location name is required')
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI API to generate location information
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a travel expert. Generate positive, engaging location information for travel destinations. Always respond with valid JSON in this exact format:
{
  "name": "Location Name",
  "country": "Country Name", 
  "description": "2-3 sentence positive description highlighting what makes this place special and unique",
  "thingsToDo": ["Activity 1", "Activity 2", "Activity 3"],
  "priceRange": "$XX-XXX per day",
  "bestSeason": "Season description"
}

Make the description enthusiastic and appealing. Include 3 specific activities. Provide realistic price ranges. Be positive and inspiring.`
          },
          {
            role: 'user',
            content: `Generate travel information for: ${locationName}`
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0].message.content

    try {
      const locationInfo = JSON.parse(content)
      
      return new Response(
        JSON.stringify(locationInfo),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError)
      throw new Error('Invalid response format from OpenAI')
    }

  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: true,
        name: req.json?.locationName || 'Unknown Location',
        country: 'Unknown',
        description: 'A beautiful destination offering unique experiences and cultural attractions.',
        thingsToDo: ['Explore local attractions', 'Experience local culture', 'Try regional cuisine'],
        priceRange: '$50-150 per day',
        bestSeason: 'Year-round'
      }),
      { 
        status: 200, // Return 200 with fallback data instead of error
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})