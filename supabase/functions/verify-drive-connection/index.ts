import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabaseClient
      .from('google_drive_auth')
      .select('access_token, refresh_token, app_folder_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (authError || !authData) {
      return new Response(
        JSON.stringify({ connected: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to call Google Drive API to verify token
    const verifyResponse = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${authData.access_token}` }
    });

    if (verifyResponse.ok) {
      return new Response(
        JSON.stringify({ connected: true, folderId: authData.app_folder_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If unauthorized, try refreshing
    if (verifyResponse.status === 401 && authData.refresh_token) {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: authData.refresh_token,
          grant_type: "refresh_token",
        }).toString(),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        
        // Update tokens in DB
        await supabaseClient
          .from('google_drive_auth')
          .update({ 
            access_token: refreshData.access_token,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ connected: true, folderId: authData.app_folder_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If we reach here, the connection is dead (revoked or refresh token invalid)
    return new Response(
      JSON.stringify({ connected: false, error: "Connection expired" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Verify error:", error);
    return new Response(
      JSON.stringify({ connected: false, error: "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
