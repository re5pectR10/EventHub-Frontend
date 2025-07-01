import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-server";

// Get ticket types for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const supabaseServer = await getServerSupabaseClient();
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
