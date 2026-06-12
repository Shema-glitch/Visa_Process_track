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
    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "No file ID provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let { data: authData, error: authError } = await supabaseClient
      .from('google_drive_auth')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .single();

    if (authError || !authData) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = authData.access_token;

    const attemptGetFile = async (token: string) => {
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (fileResponse.status === 401) return { error: 'unauthorized' };

      const fileData = await fileResponse.json();
      if (!fileResponse.ok) {
        throw new Error(fileData.error?.message || "Failed to get file");
      }
      return { data: fileData };
    };

    let result = await attemptGetFile(accessToken);

    if (result.error === 'unauthorized' && authData.refresh_token) {
      console.log("Refreshing Google Drive token...");
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
        accessToken = refreshData.access_token;

        await supabaseClient
          .from('google_drive_auth')
          .update({ 
            access_token: accessToken,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        result = await attemptGetFile(accessToken);
      }
    }

    if (result.error) {
      throw new Error(result.error === 'unauthorized' ? "Authentication with Google Drive failed. Please reconnect." : "Failed to get file");
    }

    return new Response(
      JSON.stringify({
        url: result.data.webViewLink,
        downloadUrl: result.data.webContentLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Get file URL error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to get file URL" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
