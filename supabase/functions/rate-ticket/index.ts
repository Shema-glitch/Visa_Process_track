import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Rate a resolved support ticket, then delete it and all its messages.
 *
 * Flow:
 *   1. User submits { ticketId, rating }
 *   2. Verify the ticket belongs to the user and is resolved
 *   3. Save the rating (for analytics)
 *   4. Delete all messages for the ticket
 *   5. Delete the ticket itself
 *   6. Return success
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { ticketId, rating } = await req.json();

    if (!ticketId || !rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "ticketId and rating (1-5) are required" }),
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

    // Verify ticket exists, belongs to user, and is resolved
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("support_tickets")
      .select("id, status, user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ticket.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ticket.status !== "resolved") {
      return new Response(
        JSON.stringify({ error: "Ticket must be resolved before rating" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save the rating
    const { error: updateError } = await supabaseClient
      .from("support_tickets")
      .update({
        rating,
        rated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (updateError) {
      console.error("Failed to save rating:", updateError);
    }

    // Delete all messages for this ticket
    const { error: msgDeleteError } = await supabaseClient
      .from("support_messages")
      .delete()
      .eq("ticket_id", ticketId);

    if (msgDeleteError) {
      console.error("Failed to delete messages:", msgDeleteError);
    }

    // Delete the ticket
    const { error: ticketDeleteError } = await supabaseClient
      .from("support_tickets")
      .delete()
      .eq("id", ticketId);

    if (ticketDeleteError) {
      console.error("Failed to delete ticket:", ticketDeleteError);
      throw new Error("Failed to delete ticket");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Thank you for your feedback!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rate ticket error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process rating" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
