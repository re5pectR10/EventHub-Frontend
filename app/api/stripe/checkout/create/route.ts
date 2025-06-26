import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabase-server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

interface TicketRequest {
  ticket_type_id: string;
  quantity: number;
}

interface CheckoutRequest {
  event_id: string;
  tickets: TicketRequest[];
  customer_email?: string;
}

// POST /api/stripe/checkout/create - Create Stripe Checkout session for ticket purchase
export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json();
    const { event_id, tickets, customer_email } = body;

    // Validate input
    if (
      !event_id ||
      !tickets ||
      !Array.isArray(tickets) ||
      tickets.length === 0
    ) {
      return NextResponse.json(
        { error: "Event ID and tickets are required" },
        { status: 400 }
      );
    }

    // Validate ticket format
    for (const ticket of tickets) {
      if (!ticket.ticket_type_id || !ticket.quantity || ticket.quantity <= 0) {
        return NextResponse.json(
          { error: "Invalid ticket data: missing ticket_type_id or quantity" },
          { status: 400 }
        );
      }
    }

    // Get event details with organizer info
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select(
        `
        *,
        organizers!inner(
          id,
          stripe_account_id,
          verification_status
        )
      `
      )
      .eq("id", event_id)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      console.error("Event fetch error:", eventError);
      return NextResponse.json(
        { error: "Event not found or not published" },
        { status: 404 }
      );
    }

    // Check if organizer has connected Stripe account
    if (!event.organizers?.stripe_account_id) {
      return NextResponse.json(
        { error: "Event organizer has not connected Stripe account" },
        { status: 400 }
      );
    }

    if (event.organizers.verification_status !== "verified") {
      return NextResponse.json(
        { error: "Event organizer's Stripe account is not verified" },
        { status: 400 }
      );
    }

    // Get ticket types and validate availability
    const ticketTypeIds = tickets.map((t) => t.ticket_type_id);
    const { data: ticketTypes, error: ticketError } = await supabaseServer
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)
      .eq("event_id", event_id);

    if (ticketError || !ticketTypes) {
      console.error("Ticket types fetch error:", ticketError);
      return NextResponse.json(
        { error: "Failed to fetch ticket types" },
        { status: 500 }
      );
    }

    // Validate ticket availability and create line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let totalAmount = 0;

    for (const ticket of tickets) {
      const ticketType = ticketTypes.find(
        (tt: any) => tt.id === ticket.ticket_type_id
      );

      if (!ticketType) {
        return NextResponse.json(
          {
            error: `Ticket type ${ticket.ticket_type_id} not found or inactive`,
          },
          { status: 400 }
        );
      }

      const availableQuantity =
        ticketType.quantity_available - ticketType.quantity_sold;
      if (ticket.quantity > availableQuantity) {
        return NextResponse.json(
          {
            error: `Only ${availableQuantity} tickets available for ${ticketType.name}`,
          },
          { status: 400 }
        );
      }

      // Check max per order limit
      if (
        ticketType.max_per_order &&
        ticket.quantity > ticketType.max_per_order
      ) {
        return NextResponse.json(
          {
            error: `Maximum ${ticketType.max_per_order} tickets allowed per order for ${ticketType.name}`,
          },
          { status: 400 }
        );
      }

      const itemTotal = ticketType.price * ticket.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || `Ticket for ${event.title}`,
            metadata: {
              event_id: event.id,
              ticket_type_id: ticketType.id,
            },
          },
          unit_amount: Math.round(ticketType.price * 100), // Convert to cents
        },
        quantity: ticket.quantity,
      });
    }

    // Calculate platform fee (5%)
    const platformFeeAmount = Math.round(totalAmount * 0.05 * 100); // 5% in cents

    // Create Stripe Checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/checkout/${event_id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/events/${event.slug}/book`,
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: event.organizers.stripe_account_id,
        },
      },
      metadata: {
        event_id: event_id,
        tickets: JSON.stringify(tickets),
        total_amount: totalAmount.toString(),
      },
    };

    if (customer_email) {
      sessionParams.customer_email = customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `Stripe checkout session created: ${session.id} for event: ${event_id}`
    );

    return NextResponse.json({
      data: {
        checkout_url: session.url,
        session_id: session.id,
      },
    });
  } catch (error) {
    console.error("Stripe Checkout creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
