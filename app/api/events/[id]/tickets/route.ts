import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface TicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
}

// Helper function to sanitize timestamp fields
function sanitizeTimestampFields(data: TicketTypeRequest) {
  return {
    ...data,
    sale_start_date: data.sale_start_date?.trim() || null,
    sale_end_date: data.sale_end_date?.trim() || null,
  };
}

// GET /api/events/[id]/tickets - Get ticket types for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId } = await params;

    const supabaseServer = await getServerSupabaseClient();
    const { data: ticketTypes, error } = await supabaseServer
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("price", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch ticket types: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticket_types: ticketTypes || [] });
  } catch (error) {
    console.error("Ticket types fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket types" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/tickets - Create ticket types for an event (organizers only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId } = await params;
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const rawTicketData: TicketTypeRequest = await request.json();
    const ticketData = sanitizeTimestampFields(rawTicketData);

    const supabaseServer = await getServerSupabaseClient();

    // Check if user owns this event
    const { data: organizer } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!organizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    // Verify event ownership
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .eq("organizer_id", organizer.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or you don't have permission" },
        { status: 404 }
      );
    }

    // Create ticket type
    const { data: ticketType, error: ticketError } = await supabaseServer
      .from("ticket_types")
      .insert({
        ...ticketData,
        event_id: eventId,
        quantity_sold: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ticketError) {
      console.error("Database error:", ticketError);
      return NextResponse.json(
        { error: `Failed to create ticket type: ${ticketError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ticket_type: ticketType,
        message: "Ticket type created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ticket type creation error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket type" },
      { status: 500 }
    );
  }
}
