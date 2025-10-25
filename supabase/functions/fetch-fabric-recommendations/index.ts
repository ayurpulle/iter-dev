import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destination, interests, accessToken } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct search query for Fabric API
    const searchQuery = interests && interests.length > 0
      ? `${destination} ${interests.join(' ')}`
      : destination;

    console.log(`Fetching Fabric recommendations for: ${searchQuery}`);

    // Call Fabric API to search for relevant content
    // Note: Replace with actual Fabric API endpoint when credentials are available
    const fabricApiUrl = Deno.env.get('FABRIC_API_URL') || 'https://api.onfabric.com/v1/search';
    
    const response = await fetch(fabricApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        filters: {
          tags: ['travel', 'recommendations', 'guides']
        }
      })
    });

    if (!response.ok) {
      console.error(`Fabric API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      // Return empty recommendations instead of error to gracefully degrade
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform Fabric response into our recommendation format
    const recommendations = (data.results || []).map((item: any) => ({
      title: item.title || item.name || 'Untitled',
      url: item.url || item.link || '',
      content: item.content || item.description || '',
      tags: item.tags || [],
      source: 'Fabric'
    }));

    console.log(`Successfully fetched ${recommendations.length} recommendations from Fabric`);

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-fabric-recommendations:', error);
    
    // Return empty recommendations to gracefully handle errors
    return new Response(
      JSON.stringify({ recommendations: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
