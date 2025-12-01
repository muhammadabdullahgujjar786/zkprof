import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as nacl from "https://esm.sh/tweetnacl@1.0.3";
import { decode as decodeBase58 } from "https://esm.sh/bs58@5.0.0";

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

    const { blob_id, platform_id, wallet_public_key, signature } = await req.json();

    console.log('Revoke access request:', { blob_id, platform_id, wallet_public_key });

    // Validate inputs
    if (!blob_id || !platform_id || !wallet_public_key || !signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: blob_id, platform_id, wallet_public_key, signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify wallet signature
    const message = `Revoke access to zkPFP ${blob_id} for platform ${platform_id}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const publicKeyBytes = decodeBase58(wallet_public_key);

    const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    if (!verified) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find and update access grant
    const { data: grant, error: findError } = await supabase
      .from('access_grants')
      .select('*')
      .eq('blob_id', blob_id)
      .eq('platform_id', platform_id)
      .eq('owner_wallet', wallet_public_key)
      .single();

    if (findError || !grant) {
      return new Response(
        JSON.stringify({ error: 'Access grant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Revoke access
    const { error: updateError } = await supabase
      .from('access_grants')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', grant.id);

    if (updateError) {
      console.error('Error revoking access:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to revoke access', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Access revoked successfully:', grant.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Access revoked successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in revoke-access:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});