import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dataType, items, userId } = await req.json();

    console.log(`Syncing ${dataType} data for user ${userId}, ${items.length} items`);

    // Determine which table to insert into based on dataType
    let tableName: string;
    switch (dataType) {
      case 'google_search':
        tableName = 'google_search_raw_threads';
        break;
      case 'instagram_interactions':
        tableName = 'instagram_interactions';
        break;
      case 'instagram_general':
        tableName = 'instagram_general';
        break;
      case 'google_search_summaries':
        tableName = 'google_search_summaries';
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    // Transform items for insertion
    const insertData = items.map((item: any) => ({
      user_id: userId,
      fabric_item_id: item.id,
      provider: item.provider,
      data_type: item.data_type,
      data_subtype: item.data_subtype,
      interaction_type: item.interaction_type,
      preview: item.preview,
      payload: item.payload,
      asat: item.asat,
      content: item.content,
      details: item.details,
      version: item.version,
      provider_connection_id: item.provider_connection_id,
      is_pii: item.is_pii || false,
      is_health_related: item.is_health_related || false,
      is_pornographic: item.is_pornographic || false,
    }));

    // Insert data with conflict handling
    const { data, error } = await supabase
      .from(tableName)
      .upsert(insertData, {
        onConflict: 'user_id,fabric_item_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error inserting data:', error);
      throw error;
    }

    console.log(`Successfully synced ${data?.length || 0} items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: data?.length || 0,
        message: `Successfully synced ${data?.length || 0} items to ${tableName}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-fabric-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});