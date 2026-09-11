import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
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
        JSON.stringify({ success: false, count: 0, message: "Google Drive not connected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = authData.access_token;
    const folderId = authData.app_folder_id;

    if (!folderId) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No archive folder exists in Google Drive yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listFiles = async (token: string) => {
      const q = `'${folderId}' in parents and trashed = false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1000`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 401) return { error: 'unauthorized' };
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to list files");
      }
      return { data: data.files || [] };
    };

    let listResult = await listFiles(accessToken);

    if (listResult.error === 'unauthorized' && authData.refresh_token) {
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

        listResult = await listFiles(accessToken);
      }
    }

    if (listResult.error) {
      throw new Error(listResult.error === 'unauthorized' ? "Authentication with Google Drive failed." : "Failed to list files");
    }

    const driveFiles = listResult.data;

    // Fetch user requirements from database
    const { data: requirements, error: reqError } = await supabaseClient
      .from('requirements')
      .select('*')
      .eq('user_id', user.id);

    if (reqError) throw reqError;

    // Fetch existing attachments
    const { data: existingAttachments, error: attError } = await supabaseClient
      .from('requirement_attachments')
      .select('*')
      .eq('user_id', user.id);

    if (attError) throw attError;

    let syncedCount = 0;

    for (const file of driveFiles) {
      const name = file.name || "";
      let reqName = "";
      let languageTag = "Universal";
      let originalFileName = name;

      if (name.includes("__")) {
        const parts = name.split("__");
        if (parts.length >= 3) {
          reqName = parts[0];
          languageTag = parts[1];
          originalFileName = parts.slice(2).join("__");
        } else if (parts.length === 2) {
          reqName = "";
          languageTag = parts[0];
          originalFileName = parts[1];
        }
      }

      if (!["English", "Kinyarwanda", "Universal"].includes(languageTag)) {
        languageTag = "Universal";
      }

      let matchedReq = null;
      if (reqName) {
        matchedReq = requirements.find(
          (r: any) => r.name.toLowerCase().trim() === reqName.toLowerCase().trim()
        );
      }

      if (!matchedReq) {
        // Fallback: search by comparing requirement name with filename
        const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
        matchedReq = requirements.find((r: any) => {
          const rName = r.name.toLowerCase().trim();
          const fName = nameWithoutExt.toLowerCase().trim();
          return rName === fName || fName.includes(rName) || rName.includes(fName);
        });
      }

      if (matchedReq) {
        // Check if attachment already exists
        const alreadyExists = existingAttachments.some(
          (att: any) => att.requirement_id === matchedReq.id && att.language_tag === languageTag
        );

        if (!alreadyExists) {
          const { error: insertError } = await supabaseClient
            .from('requirement_attachments')
            .insert({
              requirement_id: matchedReq.id,
              user_id: user.id,
              gdrive_file_id: file.id,
              filename: originalFileName,
              language_tag: languageTag
            });

          if (insertError) {
            console.error("Failed to insert attachment sync row:", insertError);
          } else {
            syncedCount++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: syncedCount, message: `Successfully synced ${syncedCount} files` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
