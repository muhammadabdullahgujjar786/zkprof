import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { platform_name, platform_domain, contact_email } = await req.json();

    console.log('Registering platform:', { platform_name, platform_domain, contact_email });

    // Validate inputs
    if (!platform_name || !platform_domain || !contact_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: platform_name, platform_domain, contact_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate API key (32 bytes random)
    const apiKeyBytes = new Uint8Array(32);
    crypto.getRandomValues(apiKeyBytes);
    const apiKey = btoa(String.fromCharCode(...apiKeyBytes));

    // Hash the API key for storage (using SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Insert platform registration
    const { data: platform, error } = await supabase
      .from('platform_registrations')
      .insert({
        platform_name,
        platform_domain,
        contact_email,
        api_key_hash: apiKeyHash,
        credit_balance_usd: 0.00
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting platform:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to register platform', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Platform registered successfully:', platform.id);

    return new Response(
      JSON.stringify({
        platform_id: platform.id,
        api_key: apiKey,
        message: 'Platform registered successfully. Save this API key - it will not be shown again.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in register-platform:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});