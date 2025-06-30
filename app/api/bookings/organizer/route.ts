import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "../../../../lib/supabase-server";

// Helper function to check if user is organizer
async function getOrganizer(userId: string, supabaseServer: any) {
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

// GET /api/bookings/organizer - Get all bookings for organizer's events
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

    // Check if user is an organizer
    const organizer = await getOrganizer(user.id, supabaseServer);
    if (!organizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    // Get all bookings for events owned by this organizer
    const { data: bookings, error } = await supabaseServer
      .from("bookings")
      .select(
        `
        *,
        events!inner (
          id,
          title,
          start_date,
          start_time,
          location_name,
          organizer_id
        ),
        booking_items (
          quantity,
          unit_price,
          total_price,
          ticket_types (
            name,
            description
          )
        ),
        tickets (
          id,
          ticket_code,
          qr_code,
          status,
          scanned_at
        )
      `
      )
      .eq("events.organizer_id", organizer.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch organizer bookings: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookings: bookings || [],
      organizer_id: organizer.id,
    });
  } catch (error) {
    console.error("Organizer bookings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizer bookings" },
      { status: 500 }
    );
  }
}
