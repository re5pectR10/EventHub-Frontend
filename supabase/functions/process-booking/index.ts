import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import type { User } from "jsr:@supabase/supabase-js@2";

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse booking request
    const booking: BookingRequest = await req.json();

    // Calculate total amount
    const totalAmount = booking.tickets.reduce(
      (sum: number, ticket: BookingTicket) =>
        sum + ticket.price * ticket.quantity,
      0
    );

    // Create booking record
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        event_id: booking.eventId,
        total_price: totalAmount,
        status: "pending",
        special_requests: booking.specialRequests,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return new Response("Failed to create booking", { status: 500 });
    }

    // Create ticket records
    const ticketPromises = booking.tickets.map((ticket: BookingTicket) =>
      supabase.from("booking_tickets").insert({
        booking_id: bookingData.id,
        ticket_type: ticket.type,
        quantity: ticket.quantity,
        unit_price: ticket.price,
        total_price: ticket.price * ticket.quantity,
      })
    );

    // Create attendee records
    const attendeePromises = booking.attendees.map(
      (attendee: BookingAttendee) =>
        supabase.from("booking_attendees").insert({
          booking_id: bookingData.id,
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone,
        })
    );

    // Execute all insertions
    await Promise.all([...ticketPromises, ...attendeePromises]);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: bookingData.id,
        totalAmount,
        message: "Booking created successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      }
    );
  } catch (error) {
    console.error("Error processing booking:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
