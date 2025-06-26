import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabase-server";

// Get ticket types for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;

    const { data: ticketTypes, error } = await supabaseServer
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

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
