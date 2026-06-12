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
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
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
      .select('access_token, refresh_token, app_folder_id')
      .eq('user_id', user.id)
      .single();

    if (authError || !authData) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = authData.access_token;

    // Helper function to upload
    const attemptUpload = async (token: string, folderId: string | null) => {
      // Create app folder if it doesn't exist
      if (!folderId) {
        const folderResponse = await fetch(
          "https://www.googleapis.com/drive/v3/files?fields=id",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "Visa Vault Archive",
              mimeType: "application/vnd.google-apps.folder",
            }),
          }
        );

        if (folderResponse.status === 401) return { error: 'unauthorized' };

        const folderData = await folderResponse.json();
        folderId = folderData.id;

        // Update folder ID in DB
        await supabaseClient
          .from('google_drive_auth')
          .update({ app_folder_id: folderId })
          .eq('user_id', user.id);
      }

      const uploadFormData = new FormData();
      uploadFormData.append("metadata", new Blob([JSON.stringify({
        name: file.name,
        parents: [folderId],
      })], { type: "application/json" }));
      uploadFormData.append("file", file);

      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        }
      );

      if (uploadResponse.status === 401) return { error: 'unauthorized' };

      const uploadedFileData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadedFileData.error?.message || "Upload failed");
      }
      return { data: uploadedFileData };
    };

    let result = await attemptUpload(accessToken, authData.app_folder_id);

    // If unauthorized, try refreshing token
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

        // Update tokens in DB
        await supabaseClient
          .from('google_drive_auth')
          .update({ 
            access_token: accessToken,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Retry upload
        result = await attemptUpload(accessToken, authData.app_folder_id);
      }
    }

    if (result.error) {
      throw new Error(result.error === 'unauthorized' ? "Authentication with Google Drive failed. Please reconnect." : "Upload failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId: result.data.id,
        fileName: file.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
