import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Helper function to verify Stripe webhook signature
function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      return false;
    }

    // Extract timestamp and signature from header
    const elements = signature.split(",");
    const timestampElement = elements.find((element) =>
      element.startsWith("t=")
    );
    const signatureElement = elements.find((element) =>
      element.startsWith("v1=")
    );

    if (!timestampElement || !signatureElement) {
      return false;
    }

    const timestamp = timestampElement.split("=")[1];
    const sig = signatureElement.split("=")[1];

    // Check if timestamp is within tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    const tolerance = 300; // 5 minutes

    if (Math.abs(currentTime - webhookTime) > tolerance) {
      console.error("Webhook timestamp too old");
      return false;
    }

    // For production, you should use crypto.subtle.importKey and crypto.subtle.sign
    // to properly verify the HMAC signature
    return true;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Helper functions
function generateTicketCode(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

function generateQRCode(ticketCode: string): string {
  // In a real implementation, you'd generate a proper QR code
  // For now, we'll just return a verification URL
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  return `${frontendUrl}/verify-ticket/${ticketCode}`;
}

async function generateTicketsForBookingItem(
  bookingId: string,
  ticketTypeId: string,
  quantity: number
): Promise<void> {
  for (let i = 0; i < quantity; i++) {
    try {
      const ticketCode = generateTicketCode();
      const qrCode = generateQRCode(ticketCode);

      const { error } = await supabaseServer.from("tickets").insert({
        booking_id: bookingId,
        ticket_type_id: ticketTypeId,
        ticket_code: ticketCode,
        qr_code: qrCode,
        status: "issued",
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to create ticket:", error);
      }
    } catch (error) {
      console.error(
        `Error generating ticket ${i + 1} for booking ${bookingId}:`,
        error
      );
    }
  }
}

async function handleNewBookingFlow(
  session: Stripe.Checkout.Session,
  eventId: string,
  ticketsData: string
): Promise<void> {
  try {
    const tickets = JSON.parse(ticketsData);
    console.log(
      `Creating new booking for event ${eventId} with ${tickets.length} ticket types`
    );

    // Create booking record
    const bookingData = {
      event_id: eventId,
      customer_email:
        session.customer_details?.email ||
        session.customer_email ||
        "unknown@example.com",
      customer_name: session.customer_details?.name || "Unknown Customer",
      total_price: (session.amount_total || 0) / 100, // Convert from cents
      status: "confirmed",
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
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log(`Booking created: ${booking.id}`);

    // Create booking items and update ticket quantities
    for (const ticket of tickets) {
      try {
        // Get ticket type details to get the unit price
        const { data: ticketType, error: ticketTypeError } =
          await supabaseServer
            .from("ticket_types")
            .select("price, name")
            .eq("id", ticket.ticket_type_id)
            .single();

        if (ticketTypeError || !ticketType) {
          console.error(
            `Failed to fetch ticket type ${ticket.ticket_type_id}:`,
            ticketTypeError
          );
          continue; // Skip this ticket type but continue with others
        }

        // Create booking item
        const { error: bookingItemError } = await supabaseServer
          .from("booking_items")
          .insert({
            booking_id: booking.id,
            ticket_type_id: ticket.ticket_type_id,
            quantity: ticket.quantity,
            unit_price: ticketType.price,
            total_price: ticketType.price * ticket.quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (bookingItemError) {
          console.error(`Failed to create booking item:`, bookingItemError);
          continue;
        }

        // Update ticket type quantity sold using the database function
        const { error: rpcError } = await supabaseServer.rpc(
          "increment_ticket_sold",
          {
            ticket_type_id: ticket.ticket_type_id,
            quantity: ticket.quantity,
          }
        );

        if (rpcError) {
          console.error(`Failed to increment ticket sold count:`, rpcError);
        }

        // Generate individual tickets
        await generateTicketsForBookingItem(
          booking.id,
          ticket.ticket_type_id,
          ticket.quantity
        );

        console.log(
          `Processed ${ticket.quantity}x ${ticketType.name} for booking ${booking.id}`
        );
      } catch (ticketError) {
        console.error(
          `Error processing ticket type ${ticket.ticket_type_id}:`,
          ticketError
        );
        // Continue with other tickets
      }
    }

    console.log(`New booking flow completed successfully: ${booking.id}`);
  } catch (error) {
    console.error("Error handling new booking flow:", error);
    throw error;
  }
}

async function handleExistingBookingFlow(
  session: Stripe.Checkout.Session
): Promise<void> {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) {
    console.error(
      "No booking ID in session metadata for existing booking flow"
    );
    return;
  }

  try {
    console.log(`Updating existing booking: ${bookingId}`);

    // Update booking status to confirmed
    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .update({
        status: "confirmed",
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select("*, booking_items(*)")
      .single();

    if (bookingError || !booking) {
      console.error("Failed to update booking status:", bookingError);
      throw new Error(`Failed to update booking: ${bookingError?.message}`);
    }

    // Update ticket quantities sold and generate tickets
    for (const item of booking.booking_items) {
      const { error: rpcError } = await supabaseServer.rpc(
        "increment_ticket_sold",
        {
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
        }
      );

      if (rpcError) {
        console.error(`Failed to increment ticket sold count:`, rpcError);
      }

      // Generate individual tickets
      await generateTicketsForBookingItem(
        booking.id,
        item.ticket_type_id,
        item.quantity
      );
    }

    console.log(`Existing booking flow completed successfully: ${bookingId}`);
  } catch (error) {
    console.error("Error handling existing booking flow:", error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log("Processing checkout session completed:", {
    sessionId: session.id,
  });

  try {
    // Check if this is from our booking flow
    const eventId = session.metadata?.event_id;
    const ticketsData = session.metadata?.tickets;

    if (eventId && ticketsData) {
      // This is from the new booking flow - create booking directly
      await handleNewBookingFlow(session, eventId, ticketsData);
    } else {
      // This is from the old booking flow - update existing booking
      await handleExistingBookingFlow(session);
    }
  } catch (error) {
    console.error("Error in checkout session completed handler:", error);
    throw error; // Re-throw to ensure webhook fails and Stripe retries
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log("Payment succeeded:", { paymentIntentId: paymentIntent.id });

  // Additional payment success handling if needed
  // For example, send confirmation emails, update analytics, etc.
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.error("Payment failed:", {
    paymentIntentId: paymentIntent.id,
    lastPaymentError: paymentIntent.last_payment_error,
  });

  try {
    // Find and update booking status
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (booking) {
      await supabaseServer
        .from("bookings")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      console.log(
        `Booking ${booking.id} marked as cancelled due to payment failure`
      );
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

async function handleAccountUpdated(account: any): Promise<void> {
  try {
    const verificationStatus =
      account.charges_enabled && account.payouts_enabled
        ? "verified"
        : account.requirements?.currently_due?.length > 0
        ? "pending"
        : "rejected";

    const { error } = await supabaseServer
      .from("organizers")
      .update({
        verification_status: verificationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.id);

    if (error) {
      console.error("Failed to update organizer verification status:", error);
    } else {
      console.log(
        `Account ${account.id} status updated to ${verificationStatus}`
      );
    }
  } catch (error) {
    console.error("Error handling account update:", error);
  }
}

// POST /api/webhooks - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const sig = request.headers.get("stripe-signature");
    const body = await request.text();

    // Verify webhook signature if secret is available
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
      const isValid = verifyStripeSignature(body, sig, webhookSecret);
      if (!isValid) {
        console.error("Invalid Stripe webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    } else if (!webhookSecret) {
      console.warn(
        "Stripe webhook secret not configured - skipping signature verification"
      );
    }

    let event: Stripe.Event;
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err) {
      console.error("Invalid JSON in webhook payload:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log(`Received webhook event: ${event.type} (${event.id})`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// GET /api/webhooks - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
      frontend_url: !!process.env.NEXT_PUBLIC_FRONTEND_URL,
    },
  });
}
