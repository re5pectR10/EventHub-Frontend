import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/organizers/events - Get events for a specific organizer (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get("organizer_id");

    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer ID is required" },
        { status: 400 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    const { data: organizer, error: organizerError } = await supabaseServer
      .from("organizers")
      .select("id, business_name")
      .eq("id", organizerId)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    // Get published events for this organizer
    const { data: events, error: eventsError } = await supabaseServer
      .from("events")
      .select(
        `
        *,
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
      )
      .eq("organizer_id", organizerId)
      .eq("status", "published")
      .order("start_date", { ascending: true });

    if (eventsError) {
      console.error("Database error:", eventsError);
      return NextResponse.json(
        { error: `Failed to fetch events: ${eventsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      organizer: organizer,
    });
  } catch (error) {
    console.error("Organizer events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizer events" },
      { status: 500 }
    );
  }
}
