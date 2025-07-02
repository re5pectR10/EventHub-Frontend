import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";

// Type for event with nested organizer data
// Note: Supabase returns nested relations as arrays even with .single()
interface EventWithOrganizer {
  organizer_id: string;
  organizers: {
    user_id: string;
  }[];
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PATCH /api/events/[id]/status - Update event status (organizers only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { status } = await request.json();

    if (!status || !["draft", "published", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be draft, published, or cancelled" },
        { status: 400 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Check if user owns this event
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("organizer_id, organizers(user_id)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify ownership - now properly typed
    const typedEvent = event as EventWithOrganizer;
    if (typedEvent.organizers?.[0]?.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this event" },
        { status: 403 }
      );
    }

    // Update event status
    const { data: updatedEvent, error: updateError } = await supabaseServer
      .from("events")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: `Failed to update event status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      event: updatedEvent,
      message: `Event status updated to ${status}`,
    });
  } catch (error) {
    console.error("Event status update error:", error);
    return NextResponse.json(
      { error: "Failed to update event status" },
      { status: 500 }
    );
  }
}
