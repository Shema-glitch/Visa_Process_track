import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
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

    // Get user's Google Drive tokens from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Extract user ID from JWT token (simplified)
    const token = authHeader.split(" ")[1];

    const authResponse = await fetch(
      `${supabaseUrl}/rest/v1/google_drive_auth?limit=1`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const authData: Array<{ access_token: string; app_folder_id: string | null }> = await authResponse.json();

    if (!authData || authData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { access_token, app_folder_id } = authData[0];

    // Create app folder if it doesn't exist
    let folderId = app_folder_id;
    if (!folderId) {
      const folderResponse = await fetch(
        "https://www.googleapis.com/drive/v3/files?fields=id",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "My Turkey/TRNC Visa Archive",
            mimeType: "application/vnd.google-apps.folder",
          }),
        }
      );

      const folderData = await folderResponse.json();
      folderId = folderData.id;
    }

    // Upload file to Google Drive
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
          Authorization: `Bearer ${access_token}`,
        },
        body: uploadFormData,
      }
    );

    const uploadedFile = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(uploadedFile.error?.message || "Upload failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId: uploadedFile.id,
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
