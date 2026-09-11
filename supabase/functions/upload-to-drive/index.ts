import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHASE_FOLDERS: Record<number, string> = {
  1: "Phase 1 - DIY Documents",
  2: "Phase 2 - Bank & Notary",
  3: "Phase 3 - University",
  4: "Phase 4 - Embassy",
};

/**
 * Finds a subfolder by name inside a parent folder.
 * Returns the folder ID if found, or null.
 */
async function findSubfolder(
  token: string,
  parentId: string,
  name: string
): Promise<string | null> {
  const query = `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Finds or creates a subfolder by name inside a parent folder.
 */
async function ensureSubfolder(
  token: string,
  parentId: string,
  name: string
): Promise<string> {
  const existing = await findSubfolder(token, parentId, name);
  if (existing) return existing;

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create folder: ${name}`);
  }
  const data = await res.json();
  return data.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const customName = formData.get("name") as string;
    const phaseRaw = formData.get("phase") as string | null;
    const phase = phaseRaw ? parseInt(phaseRaw, 10) : null;

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

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabaseClient
      .from("google_drive_auth")
      .select("access_token, refresh_token, app_folder_id")
      .eq("user_id", user.id)
      .single();

    if (authError || !authData) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = authData.access_token;

    const attemptUpload = async (token: string, folderId: string | null) => {
      // Step 1: Ensure the root "Visa Vault Archive" folder exists
      if (!folderId) {
        const folderRes = await fetch(
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
        if (folderRes.status === 401) return { error: "unauthorized" };
        const folderData = await folderRes.json();
        folderId = folderData.id;

        await supabaseClient
          .from("google_drive_auth")
          .update({ app_folder_id: folderId })
          .eq("user_id", user.id);
      }

      // Step 2: Determine target folder — phase subfolder or root
      let targetFolderId = folderId;

      if (phase && PHASE_FOLDERS[phase]) {
        try {
          targetFolderId = await ensureSubfolder(token, folderId, PHASE_FOLDERS[phase]);
        } catch (err) {
          console.warn(`Failed to create phase folder, falling back to root:`, err);
          // Fall back to root folder — upload still succeeds
          targetFolderId = folderId;
        }
      }

      // Step 3: Upload the file into the target folder
      const uploadFormData = new FormData();
      uploadFormData.append(
        "metadata",
        new Blob(
          [JSON.stringify({ name: customName || file.name, parents: [targetFolderId] })],
          { type: "application/json" }
        )
      );
      uploadFormData.append("file", file);

      const uploadRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: uploadFormData,
        }
      );

      if (uploadRes.status === 401) return { error: "unauthorized" };

      const uploadedData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadedData.error?.message || "Upload failed");
      }
      return { data: uploadedData };
    };

    let result = await attemptUpload(accessToken, authData.app_folder_id);

    // Token refresh on 401
    if (result.error === "unauthorized" && authData.refresh_token) {
      console.log("Refreshing Google Drive token...");
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: authData.refresh_token,
          grant_type: "refresh_token",
        }).toString(),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;

        await supabaseClient
          .from("google_drive_auth")
          .update({ access_token: accessToken, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        result = await attemptUpload(accessToken, authData.app_folder_id);
      }
    }

    if (result.error) {
      throw new Error(
        result.error === "unauthorized"
          ? "Authentication with Google Drive failed. Please reconnect."
          : "Upload failed"
      );
    }

    return new Response(
      JSON.stringify({ success: true, fileId: result.data.id, fileName: file.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
