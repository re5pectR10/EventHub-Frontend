import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../../lib/supabase-server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Create ticket type for event
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;

    // Check if user owns this event
    const { data: organizer } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer profile required" },
        { status: 403 }
      );
    }

    // Verify event ownership
    const { data: existingEvent } = await supabaseServer
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (!existingEvent || existingEvent.organizer_id !== organizer.id) {
      return NextResponse.json(
        { error: "Event not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const ticketTypeData = {
      ...body,
      event_id: eventId,
      created_at: new Date().toISOString(),
    };

    const { data: ticketType, error } = await supabaseServer
      .from("ticket_types")
      .insert(ticketTypeData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to create ticket type: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticketType }, { status: 201 });
  } catch (error) {
    console.error("Ticket type creation error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket type" },
      { status: 500 }
    );
  }
}
