import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";

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

    const supabaseServer = await getServerSupabaseClient();
    const { data: bookings, error } = await supabaseServer
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
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch bookings: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: bookings || [] });
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
      .select("id, title, status, start_date")
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

    return NextResponse.json({
      booking,
      message: "Booking created successfully",
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
