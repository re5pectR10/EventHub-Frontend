import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../lib/supabase-server";

interface RouteParams {
  params: {
    id: string;
  };
}

// Helper function to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Get single event by ID or slug (unified route)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: identifier } = params;
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    console.log(
      `[UNIFIED ROUTE] Looking for event with identifier: ${identifier}`
    );

    // Check if identifier is a UUID or a slug
    const isUUID = isValidUUID(identifier);

    let query = supabaseServer.from("events").select(`
        *,
        organizers(id, business_name, contact_email, description, website),
        event_categories(name, slug),
        event_images(image_url, alt_text, display_order, is_primary),
        ticket_types(*)
      `);

    // Apply the appropriate filter based on identifier type
    if (isUUID) {
      console.log(`[UNIFIED ROUTE] Treating as UUID: ${identifier}`);
      query = query.eq("id", identifier);
    } else {
      console.log(`[UNIFIED ROUTE] Treating as slug: ${identifier}`);
      query = query.eq("slug", identifier);
    }

    // If user is authenticated, check if they own the event
    if (user) {
      const { data: organizer } = await supabaseServer
        .from("organizers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (organizer) {
        // If user is an organizer, they can see their own events regardless of status
        const { data: ownEvent, error: ownError } = await query
          .eq("organizer_id", organizer.id)
          .single();

        if (!ownError && ownEvent) {
          console.log(
            `[UNIFIED ROUTE] Found organizer's own event: ${ownEvent.title}`
          );
          return NextResponse.json({ event: ownEvent });
        }
      }
    }

    // For public access, only show published events
    const { data: event, error } = await query
      .eq("status", "published")
      .single();

    if (error || !event) {
      console.log(
        `[UNIFIED ROUTE] Event not found for identifier: ${identifier}, error:`,
        error
      );
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log(`[UNIFIED ROUTE] Found published event: ${event.title}`);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("[UNIFIED ROUTE] Event fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

// Update event (authenticated organizers only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const updateData = await request.json();

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

    // Update event
    const { data: updatedEvent, error: updateError } = await supabaseServer
      .from("events")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: `Failed to update event: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// Delete event (authenticated organizers only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Delete event (this will cascade to related records)
    const { error: deleteError } = await supabaseServer
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      console.error("Database error:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete event: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Event deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
