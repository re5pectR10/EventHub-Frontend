import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../../lib/supabase-server";

interface RouteParams {
  params: {
    id: string;
  };
}

// Update event status (authenticated organizers only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: eventId } = params;
    const { status } = await request.json();

    // Validate status
    if (!["draft", "published", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be draft, published, or cancelled" },
        { status: 400 }
      );
    }

    // Check if user owns this event
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("organizer_id, organizers(user_id)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if ((event.organizers as any)?.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Event status update error:", error);
    return NextResponse.json(
      { error: "Failed to update event status" },
      { status: 500 }
    );
  }
}
