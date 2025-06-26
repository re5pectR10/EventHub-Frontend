import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../../lib/supabase-server";

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

// PUT /api/bookings/[id]/status - Update booking status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: bookingId } = await params;
    const { status } = await request.json();

    // Validate status
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: pending, confirmed, or cancelled" },
        { status: 400 }
      );
    }

    // Check if user has permission to update this booking
    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .select(
        `
        user_id, 
        status,
        events(organizer_id)
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user has access to update this booking
    let hasAccess = booking.user_id === user.id;

    // If not the booking owner, check if they're the event organizer
    if (!hasAccess) {
      const organizer = await getOrganizer(user.id);
      if (
        organizer &&
        booking.events &&
        Array.isArray(booking.events) &&
        booking.events[0]
      ) {
        hasAccess = booking.events[0].organizer_id === organizer.id;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabaseServer
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
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
      .single();

    if (updateError) {
      console.error("Booking status update error:", updateError);
      return NextResponse.json(
        { error: `Failed to update booking status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      booking: updatedBooking,
      message: `Booking status updated to ${status}`,
    });
  } catch (error) {
    console.error("Booking status update error:", error);
    return NextResponse.json(
      { error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}
