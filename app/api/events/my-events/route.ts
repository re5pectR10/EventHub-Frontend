import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "../../../../lib/supabase-server";

// GET /api/events/my-events - Get events created by the authenticated organizer
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Check if user is an organizer
    const { data: organizer, error: organizerError } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    // Get events created by this organizer
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
      .eq("organizer_id", organizer.id)
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.error("Database error:", eventsError);
      return NextResponse.json(
        { error: `Failed to fetch events: ${eventsError.message}` },
        { status: 500 }
      );
    }

    // Calculate additional metrics for each event
    const eventsWithMetrics = (events || []).map((event: any) => {
      const totalTickets =
        event.ticket_types?.reduce(
          (sum: number, ticket: any) => sum + ticket.quantity_available,
          0
        ) || 0;

      const soldTickets =
        event.ticket_types?.reduce(
          (sum: number, ticket: any) => sum + ticket.quantity_sold,
          0
        ) || 0;

      const revenue =
        event.ticket_types?.reduce(
          (sum: number, ticket: any) =>
            sum + ticket.price * ticket.quantity_sold,
          0
        ) || 0;

      return {
        ...event,
        metrics: {
          total_tickets: totalTickets,
          sold_tickets: soldTickets,
          available_tickets: totalTickets - soldTickets,
          total_revenue: revenue,
          sales_percentage:
            totalTickets > 0
              ? Math.round((soldTickets / totalTickets) * 100)
              : 0,
        },
      };
    });

    return NextResponse.json({
      events: eventsWithMetrics,
      organizer_id: organizer.id,
    });
  } catch (error) {
    console.error("My events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
