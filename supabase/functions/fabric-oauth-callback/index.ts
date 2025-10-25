import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const fabricClientId = Deno.env.get('FABRIC_CLIENT_ID');
    const fabricClientSecret = Deno.env.get('FABRIC_CLIENT_SECRET');
    const fabricOAuthUrl = Deno.env.get('FABRIC_OAUTH_URL') ?? 'https://api.onfabric.com/oauth/token';

    if (!fabricClientId || !fabricClientSecret) {
      console.error('Missing Fabric OAuth credentials');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: 'Fabric OAuth credentials not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, state } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({
        error: 'Missing authorization code'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Exchanging authorization code for tokens...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch(fabricOAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: fabricClientId,
        client_secret: fabricClientSecret,
        redirect_uri: `${supabaseUrl.replace('https://', 'https://')}/functions/v1/fabric-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Fabric OAuth error:', tokenResponse.status, errorText);
      return new Response(JSON.stringify({
        error: 'Failed to exchange authorization code',
        details: errorText
      }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user_id: fabric_user_id } = tokenData;

    if (!access_token) {
      return new Response(JSON.stringify({
        error: 'Invalid token response from Fabric'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate token expiration
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Get user from state parameter (should be encoded user_id from client)
    const userId = state;

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Missing user identification'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Storing Fabric connection for user:', userId);

    // Store the connection in the database
    const { data: connection, error: dbError } = await supabase
      .from('fabric_connections')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        fabric_user_id,
        status: 'active',
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({
        error: 'Failed to store connection',
        details: dbError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fabric connection stored successfully');

    return new Response(JSON.stringify({
      success: true,
      connection: {
        id: connection.id,
        status: connection.status,
        connected_at: connection.connected_at,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fabric OAuth callback error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
