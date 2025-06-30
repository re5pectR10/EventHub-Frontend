import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSupabaseClient } from "../../../../../lib/supabase-server";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

interface CheckoutRequest {
  booking_id: string;
  success_url?: string;
  cancel_url?: string;
}

// POST /api/stripe/checkout/create - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const { booking_id, success_url, cancel_url }: CheckoutRequest =
      await request.json();

    if (!booking_id) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .select(
        `
        *,
        events(
          id,
          title,
          organizer_id,
          organizers(
            business_name,
            stripe_account_id
          )
        ),
        booking_items(
          quantity,
          unit_price,
          total_price,
          ticket_types(
            name,
            description
          )
        )
      `
      )
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Booking is not available for payment" },
        { status: 400 }
      );
    }

    // Create line items for Stripe
    const lineItems = booking.booking_items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${booking.events.title} - ${item.ticket_types.name}`,
          description: item.ticket_types.description || undefined,
        },
        unit_amount: Math.round(item.unit_price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url:
        success_url ||
        `${process.env.NEXTAUTH_URL}/events/${booking.events.id}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking_id}`,
      cancel_url:
        cancel_url || `${process.env.NEXTAUTH_URL}/events/${booking.events.id}`,
      metadata: {
        booking_id: booking_id,
        event_id: booking.events.id,
      },
      customer_email: booking.customer_email,
      payment_intent_data: {
        metadata: {
          booking_id: booking_id,
          event_id: booking.events.id,
        },
        ...(booking.events.organizers?.stripe_account_id && {
          application_fee_amount: Math.round(booking.total_price * 100 * 0.03), // 3% platform fee
          transfer_data: {
            destination: booking.events.organizers.stripe_account_id,
          },
        }),
      },
    });

    // Update booking with checkout session ID
    await supabaseServer
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("Stripe checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
