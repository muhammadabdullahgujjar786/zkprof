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

    console.log('Grant access request:', { blob_id, platform_id, wallet_public_key });

    // Validate inputs
    if (!blob_id || !platform_id || !wallet_public_key || !signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: blob_id, platform_id, wallet_public_key, signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify wallet signature
    const message = `Grant access to zkPFP ${blob_id} for platform ${platform_id}`;
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

    // Verify platform exists
    const { data: platform, error: platformError } = await supabase
      .from('platform_registrations')
      .select('id, is_active')
      .eq('id', platform_id)
      .single();

    if (platformError || !platform) {
      return new Response(
        JSON.stringify({ error: 'Platform not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!platform.is_active) {
      return new Response(
        JSON.stringify({ error: 'Platform is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify zkPFP ownership
    const { data: nft, error: nftError } = await supabase
      .from('nft_mints')
      .select('blob_id, user_public_key')
      .eq('blob_id', blob_id)
      .eq('user_public_key', wallet_public_key)
      .single();

    if (nftError || !nft) {
      return new Response(
        JSON.stringify({ error: 'zkPFP not found or you do not own this zkPFP' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update access grant
    const { data: grant, error: grantError } = await supabase
      .from('access_grants')
      .upsert({
        blob_id,
        platform_id,
        owner_wallet: wallet_public_key,
        is_active: true,
        revoked_at: null
      }, {
        onConflict: 'blob_id,platform_id'
      })
      .select()
      .single();

    if (grantError) {
      console.error('Error creating access grant:', grantError);
      return new Response(
        JSON.stringify({ error: 'Failed to grant access', details: grantError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Access granted successfully:', grant.id);

    return new Response(
      JSON.stringify({
        success: true,
        grant_id: grant.id,
        message: 'Access granted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grant-access:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});