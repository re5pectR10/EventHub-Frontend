import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../lib/supabase-server";

// Helper function to check if user is organizer
async function getOrganizer(userId: string) {
  try {
    const { data: organizer, error } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No organizer found - this is normal
        return null;
      }
      console.error("Error getting organizer:", error);
      return null;
    }

    return organizer;
  } catch (err) {
    console.error("Exception in getOrganizer:", err);
    return null;
  }
}

// GET /api/bookings/[id] - Get booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const bookingId = params.id;

    // Get booking with full details
    const { data: booking, error } = await supabaseServer
      .from("bookings")
      .select(
        `
        *,
        events(
          id,
          title,
          start_date,
          start_time,
          location_name,
          organizer_id
        ),
        booking_items(
          quantity,
          unit_price,
          total_price,
          ticket_types(name, description)
        ),
        tickets(
          id,
          ticket_code,
          qr_code,
          status,
          scanned_at
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user has access to this booking
    let hasAccess = booking.user_id === user.id;

    // If not the booking owner, check if they're the event organizer
    if (!hasAccess) {
      const organizer = await getOrganizer(user.id);
      if (organizer && booking.events) {
        hasAccess = booking.events.organizer_id === organizer.id;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Booking fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Cancel booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const bookingId = params.id;

    // Check if booking exists and user owns it
    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .select("user_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only the booking owner can cancel their booking
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { data: cancelledBooking, error: updateError } = await supabaseServer
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      console.error("Booking cancellation error:", updateError);
      return NextResponse.json(
        { error: `Failed to cancel booking: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      booking: cancelledBooking,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
