import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSupabaseClient } from "../../../../lib/supabase-server";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Helper functions
function generateTicketCode(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

function generateQRCode(ticketCode: string): string {
  // In a real implementation, you'd generate a proper QR code
  // For now, we'll just return a placeholder URL
  return `${process.env.NEXT_PUBLIC_DOMAIN}/verify-ticket/${ticketCode}`;
}

// Handle successful checkout
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const eventId = session.metadata?.event_id;
    const ticketsMetadata = session.metadata?.tickets;

    if (!eventId || !ticketsMetadata) {
      console.error("Missing required metadata in checkout session");
      return;
    }

    const tickets = JSON.parse(ticketsMetadata);
    const supabaseServer = await getServerSupabaseClient();

    // Create booking record
    const bookingData = {
      event_id: eventId,
      customer_email: session.customer_details?.email || session.customer_email,
      customer_name: session.customer_details?.name || "Unknown",
      total_amount: (session.amount_total || 0) / 100, // Convert from cents
      status: "confirmed",
      booking_code: `BK-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error("Failed to create booking:", bookingError);
      return;
    }

    // Create booking items and update ticket quantities
    for (const ticket of tickets) {
      // Get ticket type details for the unit price
      const { data: ticketType } = await supabaseServer
        .from("ticket_types")
        .select("price")
        .eq("id", ticket.ticket_type_id)
        .single();

      if (ticketType) {
        // Create booking item
        await supabaseServer.from("booking_items").insert({
          booking_id: booking.id,
          ticket_type_id: ticket.ticket_type_id,
          quantity: ticket.quantity,
          unit_price: ticketType.price,
          total_price: ticketType.price * ticket.quantity,
        });

        // Update ticket type quantity sold using RPC function
        const { error: updateError } = await supabaseServer.rpc(
          "increment_ticket_sold",
          {
            ticket_type_id: ticket.ticket_type_id,
            quantity: ticket.quantity,
          }
        );

        if (updateError) {
          console.error("Error updating ticket quantities:", updateError);
        }

        // Generate individual tickets
        for (let i = 0; i < ticket.quantity; i++) {
          const ticketCode = generateTicketCode();
          const qrCode = generateQRCode(ticketCode);

          await supabaseServer.from("tickets").insert({
            booking_id: booking.id,
            ticket_type_id: ticket.ticket_type_id,
            ticket_code: ticketCode,
            qr_code: qrCode,
            status: "issued",
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    console.log(`Booking created successfully: ${booking.id}`);
  } catch (error) {
    console.error("Error handling checkout completion:", error);
  }
}

// Handle Stripe account updates
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    const supabaseServer = await getServerSupabaseClient();

    const verificationStatus =
      account.charges_enabled && account.payouts_enabled
        ? "verified"
        : account.requirements?.currently_due &&
          account.requirements.currently_due.length > 0
        ? "pending"
        : "rejected";

    await supabaseServer
      .from("organizers")
      .update({
        verification_status: verificationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.id);

    console.log(
      `Account ${account.id} status updated to ${verificationStatus}`
    );
  } catch (error) {
    console.error("Error handling account update:", error);
  }
}

// POST /api/stripe/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const sig = request.headers.get("stripe-signature");
    const body = await request.text();

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    const supabaseServer = await getServerSupabaseClient();

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${failedPayment.id}`);

        // Mark associated booking as cancelled
        const { data: failedBooking } = await supabaseServer
          .from("bookings")
          .select("id")
          .eq("payment_intent_id", failedPayment.id)
          .single();

        if (failedBooking) {
          await supabaseServer
            .from("bookings")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", failedBooking.id);
        }
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// GET /api/stripe/webhook - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "stripe-webhook",
  });
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};
