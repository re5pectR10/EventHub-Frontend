import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromToken } from "../../../lib/supabase-server";

interface BookingTicket {
  type: string;
  quantity: number;
  price: number;
}

interface BookingAttendee {
  name: string;
  email: string;
  phone?: string;
}

interface BookingRequest {
  eventId: string;
  tickets: BookingTicket[];
  attendees: BookingAttendee[];
  specialRequests?: string;
}

// POST /api/process-booking - Process booking with attendees and tickets
export async function POST(request: NextRequest) {
  try {
    // Get user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse booking request
    const booking: BookingRequest = await request.json();

    // Validate required fields
    if (!booking.eventId || !booking.tickets || !booking.attendees) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, tickets, attendees" },
        { status: 400 }
      );
    }

    // Validate tickets array
    if (!Array.isArray(booking.tickets) || booking.tickets.length === 0) {
      return NextResponse.json(
        { error: "At least one ticket is required" },
        { status: 400 }
      );
    }

    // Validate attendees array
    if (!Array.isArray(booking.attendees) || booking.attendees.length === 0) {
      return NextResponse.json(
        { error: "At least one attendee is required" },
        { status: 400 }
      );
    }

    // Validate each ticket
    for (const ticket of booking.tickets) {
      if (!ticket.type || ticket.quantity <= 0 || ticket.price < 0) {
        return NextResponse.json(
          {
            error:
              "Invalid ticket data: type, quantity, and price are required",
          },
          { status: 400 }
        );
      }
    }

    // Validate each attendee
    for (const attendee of booking.attendees) {
      if (!attendee.name || !attendee.email) {
        return NextResponse.json(
          { error: "Invalid attendee data: name and email are required" },
          { status: 400 }
        );
      }
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("id, title, status")
      .eq("id", booking.eventId)
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

    // Calculate total amount
    const totalAmount = booking.tickets.reduce(
      (sum: number, ticket: BookingTicket) =>
        sum + ticket.price * ticket.quantity,
      0
    );

    // Create booking record
    const { data: bookingData, error: bookingError } = await supabaseServer
      .from("bookings")
      .insert({
        user_id: user.id,
        event_id: booking.eventId,
        customer_email: user.email || "unknown@example.com",
        customer_name: user.user_metadata?.full_name || "Unknown",
        total_price: totalAmount,
        status: "pending",
        special_requests: booking.specialRequests || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking", details: bookingError.message },
        { status: 500 }
      );
    }

    // Create booking items (tickets)
    const bookingItems = booking.tickets.map((ticket: BookingTicket) => ({
      booking_id: bookingData.id,
      ticket_type_id: ticket.type, // Assuming type is the ticket type ID
      quantity: ticket.quantity,
      unit_price: ticket.price,
      total_price: ticket.price * ticket.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: ticketError } = await supabaseServer
      .from("booking_items")
      .insert(bookingItems);

    if (ticketError) {
      console.error("Ticket creation error:", ticketError);
      // Try to cleanup the booking
      await supabaseServer.from("bookings").delete().eq("id", bookingData.id);
      return NextResponse.json(
        {
          error: "Failed to create booking items",
          details: ticketError.message,
        },
        { status: 500 }
      );
    }

    // Create attendee records
    const attendeeRecords = booking.attendees.map(
      (attendee: BookingAttendee) => ({
        booking_id: bookingData.id,
        name: attendee.name,
        email: attendee.email,
        phone: attendee.phone || null,
        created_at: new Date().toISOString(),
      })
    );

    const { error: attendeeError } = await supabaseServer
      .from("booking_attendees")
      .insert(attendeeRecords);

    if (attendeeError) {
      console.error("Attendee creation error:", attendeeError);
      // Note: attendees table might not exist, continue without failing
      console.warn(
        "Attendees table may not exist, continuing without attendee records"
      );
    }

    console.log(
      `Booking processed successfully: ${bookingData.id} for user ${user.id}`
    );

    // Return success response
    return NextResponse.json({
      success: true,
      booking_id: bookingData.id,
      total_amount: totalAmount,
      status: "pending",
      message: "Booking created successfully",
      event_name: event.title,
    });
  } catch (error) {
    console.error("Error processing booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/process-booking - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "process-booking",
  });
}
