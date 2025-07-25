import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

interface BookingItemRequest {
  ticket_type_id: string;
  quantity: number;
}

interface CreateBookingRequest {
  event_id: string;
  items: BookingItemRequest[];
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
}

// Type for booking item with relations for Stripe
interface BookingItemWithTicketType {
  quantity: number;
  unit_price: number;
  total_price: number;
  ticket_types: {
    name: string;
    description: string | null;
  };
}

// GET /api/bookings - Get user's bookings
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(
      request.headers.get("authorization") || undefined
    );
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const offset = (page - 1) * limit;
    const supabaseServer = await getServerSupabaseClient();

    let query = supabaseServer
      .from("bookings")
      .select(
        `
        *,
        events(title, start_date, start_time, location_name),
        booking_items(
          quantity,
          unit_price,
          total_price,
          ticket_types(name)
        ),
        tickets(id, ticket_code, qr_code, status)
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id);

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply search filter (search across customer and event data)
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,events.title.ilike.%${search}%,events.location_name.ilike.%${search}%`
      );
    }

    // Apply sorting and pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch bookings: ${error.message}` },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      bookings: bookings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(
      request.headers.get("authorization") || undefined
    );
    // Note: User authentication is optional for booking creation
    // Bookings can be created by anonymous users with just email/name

    const bookingData: CreateBookingRequest = await request.json();
    const { event_id, items, customer_name, customer_email, customer_phone } =
      bookingData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one ticket item is required" },
        { status: 400 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Validate event exists and is bookable
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("id, title, status, start_date, slug")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "published") {
      return NextResponse.json(
        { error: "Event is not available for booking" },
        { status: 400 }
      );
    }

    // Check if event is in the future
    if (new Date(event.start_date) < new Date()) {
      return NextResponse.json(
        { error: "Cannot book past events" },
        { status: 400 }
      );
    }

    let totalPrice = 0;
    const validatedItems: Array<
      BookingItemRequest & { unit_price: number; total_price: number }
    > = [];

    // Validate each ticket type and calculate pricing
    for (const item of items) {
      const { data: ticketType, error: ticketError } = await supabaseServer
        .from("ticket_types")
        .select("id, name, price, quantity_available, quantity_sold")
        .eq("id", item.ticket_type_id)
        .eq("event_id", event_id)
        .single();

      if (ticketError || !ticketType) {
        return NextResponse.json(
          { error: `Invalid ticket type: ${item.ticket_type_id}` },
          { status: 400 }
        );
      }

      // Check availability
      const availableQuantity =
        ticketType.quantity_available - ticketType.quantity_sold;
      if (item.quantity > availableQuantity) {
        return NextResponse.json(
          { error: `Not enough tickets available for ${ticketType.name}` },
          { status: 400 }
        );
      }

      const itemTotal = ticketType.price * item.quantity;
      totalPrice += itemTotal;

      validatedItems.push({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: ticketType.price,
        total_price: itemTotal,
      });
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .insert({
        user_id: user?.id || null, // Allow null for anonymous bookings
        event_id,
        customer_name,
        customer_email,
        customer_phone,
        total_price: totalPrice,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return NextResponse.json(
        { error: `Failed to create booking: ${bookingError.message}` },
        { status: 500 }
      );
    }

    // Create booking items
    const bookingItems = validatedItems.map((item) => ({
      booking_id: booking.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabaseServer
      .from("booking_items")
      .insert(bookingItems);

    if (itemsError) {
      console.error("Booking items creation error:", itemsError);
      // Rollback booking creation
      await supabaseServer.from("bookings").delete().eq("id", booking.id);
      return NextResponse.json(
        { error: `Failed to create booking items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    // Update ticket type sold quantities
    for (const item of validatedItems) {
      const { error: updateError } = await supabaseServer
        .from("ticket_types")
        .update({
          quantity_sold: supabaseServer.rpc("increment", {
            increment_by: item.quantity,
          }),
        })
        .eq("id", item.ticket_type_id);

      if (updateError) {
        console.error("Ticket quantity update error:", updateError);
        // Note: Not rolling back here as this is a soft failure
      }
    }

    // Create Stripe checkout session
    try {
      // Get the full booking data with relations for Stripe
      const { data: fullBooking, error: fullBookingError } =
        await supabaseServer
          .from("bookings")
          .select(
            `
          *,
          events(
            id,
            title,
            organizer_id,
            slug,
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
          .eq("id", booking.id)
          .single();

      if (fullBookingError || !fullBooking) {
        console.error("Failed to fetch full booking data:", fullBookingError);
        // Return booking without checkout URL as fallback
        return NextResponse.json({
          booking,
          message: "Booking created successfully",
        });
      }

      // Create line items for Stripe
      const lineItems = fullBooking.booking_items.map(
        (item: BookingItemWithTicketType) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: `${fullBooking.events.title} - ${item.ticket_types.name}`,
              description: item.ticket_types.description || undefined,
            },
            unit_amount: Math.round(item.unit_price * 100), // Convert to cents
          },
          quantity: item.quantity,
        })
      );

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/events/${fullBooking.events.slug}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/events/${fullBooking.events.slug}`,
        metadata: {
          booking_id: booking.id,
          event_id: fullBooking.events.id,
        },
        customer_email: fullBooking.customer_email,
        payment_intent_data: {
          metadata: {
            booking_id: booking.id,
            event_id: fullBooking.events.id,
          },
          ...(fullBooking.events.organizers?.stripe_account_id && {
            application_fee_amount: Math.round(
              fullBooking.total_price * 100 * 0.03
            ), // 3% platform fee
            transfer_data: {
              destination: fullBooking.events.organizers.stripe_account_id,
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
        .eq("id", booking.id);

      return NextResponse.json({
        booking,
        checkout_url: session.url,
        session_id: session.id,
        message: "Booking created successfully",
      });
    } catch (stripeError) {
      console.error("Stripe checkout creation error:", stripeError);
      // Return booking without checkout URL - user can retry payment later
      return NextResponse.json({
        booking,
        message:
          "Booking created successfully. You can complete payment from your bookings page.",
      });
    }
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
