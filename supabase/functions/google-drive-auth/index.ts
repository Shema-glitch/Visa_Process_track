import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "122661586517-b1notd57qo7vcrgalrl5mllm2fibim10.apps.googleusercontent.com",
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "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",
        redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI") || `${Deno.env.get("SUPABASE_URL")}/auth/google/callback`,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/google_drive_auth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: authHeader.split(" ")[1], // Extract user ID from token if available
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        app_folder_id: null,
      }),
    });

    if (!supabaseResponse.ok) {
      // Try to update if exists
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/google_drive_auth?user_id=eq.${authHeader}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to store tokens in database");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google Drive connected successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Authentication failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
