import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

async function sendAdminNotification(params: {
  userEmail: string;
  userName: string;
  subject: string;
  category: string;
  ticketId: string;
  firstMessage: string;
}) {
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    console.warn("Missing RESEND_API_KEY or ADMIN_EMAIL — skipping notification");
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e4e4e7;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">
      <div style="padding:28px 36px;border-bottom:1px solid #27272a;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#fafafa;">🎫 New Support Request</p>
        <p style="margin:6px 0 0;font-size:13px;color:#71717a;">A user needs help</p>
      </div>
      <div style="padding:32px 36px;">
        <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#52525b;">From</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#f4f4f5;">${params.userName} &lt;${params.userEmail}&gt;</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#52525b;">Subject</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#f4f4f5;">${params.subject}</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#52525b;">Category</p>
          <p style="margin:0 0 16px;font-size:14px;color:#a1a1aa;">${params.category}</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#52525b;">Message</p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${params.firstMessage}</p>
        </div>
        <a href="${APP_URL}?admin=support&ticket=${params.ticketId}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
          Open Ticket & Reply →
        </a>
      </div>
      <div style="padding:20px 36px;border-top:1px solid #27272a;text-align:center;">
        <p style="margin:0;font-size:12px;color:#52525b;">Visa Vault Support System</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Visa Vault Support <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `[Support] ${params.subject} — from ${params.userName}`,
        html,
      }),
    });
  } catch (err) {
    console.error("Failed to send admin notification:", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { subject, category, message } = await req.json();

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "Subject and message are required" }),
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

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category: category || "general",
        status: "open",
      })
      .select("id")
      .single();

    if (ticketError) {
      console.error("Ticket creation error:", ticketError);
      throw new Error("Failed to create ticket");
    }

    // Create the first message
    const { error: msgError } = await supabaseClient
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: message.trim(),
        is_admin: false,
      });

    if (msgError) {
      console.error("Message creation error:", msgError);
      // Ticket was created but message failed — still return success
    }

    // Send admin notification email
    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    await sendAdminNotification({
      userEmail: user.email || "unknown",
      userName,
      subject: subject.trim(),
      category: category || "general",
      ticketId: ticket.id,
      firstMessage: message.trim(),
    });

    return new Response(
      JSON.stringify({ success: true, ticketId: ticket.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Support ticket error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to create ticket" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
