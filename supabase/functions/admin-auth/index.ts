import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin login via secret + password.
 *
 * How it works:
 *   1. Verify secret matches ADMIN_SECRET
 *   2. Verify user exists and has is_admin metadata (via service role)
 *   3. Call signInWithPassword using the ANON key (standard auth endpoint)
 *   4. Return the session tokens
 *
 * Setup:
 *   1. Create admin user in Supabase Dashboard → Auth → Users → Invite user
 *   2. Set password for the admin user (click user → Set password) — use the same value as ADMIN_SECRET
 *   3. Set metadata: UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb WHERE email = 'your@email.com';
 *   4. supabase secrets set ADMIN_SECRET=your-secret ADMIN_EMAIL=your@email.com
 *   5. supabase functions deploy admin-auth --no-verify-jwt
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const email = body?.email;
    const secret = body?.secret;

    if (!email || !secret) {
      return new Response(
        JSON.stringify({ error: "Email and secret are required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!ADMIN_SECRET || !ADMIN_EMAIL || !supabaseUrl || !serviceKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured", step: "env" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // ── Verify secret ───────────────────────────────────────────────────────
    if (secret !== ADMIN_SECRET) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // ── Verify user exists and is admin ──────────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return new Response(
        JSON.stringify({ error: `listUsers failed: ${listError.message}`, step: "list" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const adminUser = usersList.users.find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: `No user with email: ${ADMIN_EMAIL}`, step: "find" }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const meta = adminUser.user_metadata as Record<string, unknown>;
    if (!meta?.is_admin) {
      return new Response(
        JSON.stringify({ error: "is_admin not set in user metadata", step: "metadata" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // ── Sign in with password using ANON key ─────────────────────────────────
    // The anon key is the public key used for standard auth operations.
    // signInWithPassword calls GoTrue's /token endpoint which returns a session.
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_SECRET, // Password must be set to the same value as ADMIN_SECRET
    });

    if (signInError || !sessionData?.session) {
      const msg = signInError?.message || "Unknown error";
      return new Response(
        JSON.stringify({
          error: `signInWithPassword failed: ${msg}`,
          step: "signin",
          hint: msg.includes("Invalid login credentials")
            ? "Set the admin user's password to the same value as ADMIN_SECRET in Supabase Dashboard → Auth → Users → click user → Set password"
            : undefined,
        }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // ── Success ──────────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_in: sessionData.session.expires_in,
          token_type: sessionData.session.token_type,
          user: {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
          },
        },
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        step: "catch",
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
