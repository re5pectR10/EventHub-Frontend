import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";

// Type definitions for the Supabase query response
interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

interface EventCategory {
  name: string;
  slug: string;
}

interface EventImage {
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
}

interface EventWithRelations {
  id: string;
  title: string;
  description: string;
  slug: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string | null;
  location_name: string;
  location_address: string;
  status: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  organizer_id: string;
  category_id: string;
  event_categories: EventCategory;
  event_images: EventImage[];
  ticket_types: TicketType[];
}

interface EventMetrics {
  total_tickets: number;
  sold_tickets: number;
  available_tickets: number;
  total_revenue: number;
  sales_percentage: number;
}

interface EventWithMetrics extends EventWithRelations {
  metrics: EventMetrics;
}

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

    // Calculate additional metrics for each event - now properly typed
    const eventsWithMetrics: EventWithMetrics[] = (events || []).map(
      (event: EventWithRelations) => {
        const totalTickets =
          event.ticket_types?.reduce(
            (sum: number, ticket: TicketType) =>
              sum + ticket.quantity_available,
            0
          ) || 0;

        const soldTickets =
          event.ticket_types?.reduce(
            (sum: number, ticket: TicketType) => sum + ticket.quantity_sold,
            0
          ) || 0;

        const revenue =
          event.ticket_types?.reduce(
            (sum: number, ticket: TicketType) =>
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
      }
    );

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
