import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Reset admin password via secret.
 *
 * Usage: POST { secret, newPassword }
 * The admin user is identified by ADMIN_EMAIL env var.
 *
 * Setup:
 *   supabase secrets set ADMIN_SECRET=xxx ADMIN_EMAIL=xxx
 *   supabase functions deploy reset-admin-password --no-verify-jwt
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const { secret, newPassword } = await req.json();

    if (!secret || !newPassword) {
      return new Response(
        JSON.stringify({ error: "secret and newPassword are required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ADMIN_SECRET || !ADMIN_EMAIL || !supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    if (secret !== ADMIN_SECRET) {
      return new Response(
        JSON.stringify({ error: "Invalid secret" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Find the admin user
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return new Response(
        JSON.stringify({ error: `Failed to list users: ${listError.message}` }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const adminUser = usersList.users.find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: `No user found with email: ${ADMIN_EMAIL}` }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { password: newPassword }
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password updated. You can now log in with the new password.",
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
