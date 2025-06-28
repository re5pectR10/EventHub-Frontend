import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../lib/supabase-server";

// POST /api/webhooks - Handle generic webhooks
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.type || payload.event_type;

    console.log("Webhook received:", eventType, payload);

    const supabaseServer = await getServerSupabaseClient();

    // Handle different webhook types
    switch (eventType) {
      case "payment.completed":
        // Handle payment completion
        if (payload.booking_id) {
          await supabaseServer
            .from("bookings")
            .update({
              status: "confirmed",
              payment_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", payload.booking_id);
        }
        break;

      case "event.published":
        // Handle event publication
        console.log("Event published:", payload.event_id);
        break;

      case "user.created":
        // Handle new user registration
        console.log("New user created:", payload.user_id);
        break;

      case "checkout.session.completed":
        // Handle Stripe checkout completion
        if (payload.booking_id) {
          await supabaseServer
            .from("bookings")
            .update({
              status: "confirmed",
              stripe_session_id: payload.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payload.booking_id);
        }
        break;

      default:
        console.log("Unhandled webhook type:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// GET /api/webhooks - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "webhooks",
  });
}
