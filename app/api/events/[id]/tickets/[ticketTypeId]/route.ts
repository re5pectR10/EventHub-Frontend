import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";

// Type for ticket type with nested event and organizer data
// Note: Supabase returns nested relations as arrays even with .single()
interface TicketTypeWithRelations {
  id: string;
  event_id: string;
  quantity_sold?: number;
  events:
    | {
        organizer_id: string;
        organizers: {
          user_id: string;
        }[];
      }[]
    | null;
}

interface RouteParams {
  params: Promise<{
    id: string; // eventId
    ticketTypeId: string;
  }>;
}

interface TicketTypeUpdateRequest {
  name?: string;
  description?: string;
  price?: number;
  quantity_available?: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  is_active?: boolean;
}

// GET /api/events/[id]/tickets/[ticketTypeId] - Get single ticket type for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId, ticketTypeId } = await params;

    const supabaseServer = await getServerSupabaseClient();
    const { data: ticketType, error } = await supabaseServer
      .from("ticket_types")
      .select(
        `
        *,
        events(
          id,
          title,
          organizer_id,
          organizers(user_id)
        )
      `
      )
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .single();

    if (error || !ticketType) {
      return NextResponse.json(
        { error: "Ticket type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket_type: ticketType });
  } catch (error) {
    console.error("Ticket type fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket type" },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id]/tickets/[ticketTypeId] - Update ticket type (organizers only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId, ticketTypeId } = await params;
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const updateData: TicketTypeUpdateRequest = await request.json();
    const supabaseServer = await getServerSupabaseClient();

    // Check if user owns this event and ticket type belongs to the event
    const { data: ticketType, error: ticketError } = await supabaseServer
      .from("ticket_types")
      .select(
        `
        id,
        event_id,
        events(
          organizer_id,
          organizers(user_id)
        )
      `
      )
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .single();

    if (ticketError || !ticketType) {
      return NextResponse.json(
        { error: "Ticket type not found for this event" },
        { status: 404 }
      );
    }

    // Check ownership through the event organizer - now properly typed
    const typedTicketType = ticketType as TicketTypeWithRelations;
    const eventOrganizerUserId =
      typedTicketType.events?.[0]?.organizers?.[0]?.user_id;
    if (eventOrganizerUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this ticket type" },
        { status: 403 }
      );
    }

    // Validate update data
    if (updateData.price !== undefined && updateData.price < 0) {
      return NextResponse.json(
        { error: "Price cannot be negative" },
        { status: 400 }
      );
    }

    if (
      updateData.quantity_available !== undefined &&
      updateData.quantity_available <= 0
    ) {
      return NextResponse.json(
        { error: "Quantity available must be greater than 0" },
        { status: 400 }
      );
    }

    if (updateData.name !== undefined && !updateData.name.trim()) {
      return NextResponse.json(
        { error: "Ticket name is required" },
        { status: 400 }
      );
    }

    // Update ticket type
    const { data: updatedTicketType, error: updateError } = await supabaseServer
      .from("ticket_types")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketTypeId)
      .eq("event_id", eventId) // Additional safety check
      .select()
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: `Failed to update ticket type: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ticket_type: updatedTicketType,
      message: "Ticket type updated successfully",
    });
  } catch (error) {
    console.error("Ticket type update error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket type" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]/tickets/[ticketTypeId] - Delete ticket type (organizers only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId, ticketTypeId } = await params;
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Check if user owns this event and ticket type belongs to the event
    const { data: ticketType, error: ticketError } = await supabaseServer
      .from("ticket_types")
      .select(
        `
        id,
        event_id,
        quantity_sold,
        events(
          organizer_id,
          organizers(user_id)
        )
      `
      )
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .single();

    if (ticketError || !ticketType) {
      return NextResponse.json(
        { error: "Ticket type not found for this event" },
        { status: 404 }
      );
    }

    // Check ownership through the event organizer - now properly typed
    const typedTicketType = ticketType as TicketTypeWithRelations;
    const eventOrganizerUserId =
      typedTicketType.events?.[0]?.organizers?.[0]?.user_id;
    if (eventOrganizerUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this ticket type" },
        { status: 403 }
      );
    }

    // Check if any tickets have been sold
    if (ticketType.quantity_sold > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete ticket type with sold tickets. Set it to inactive instead.",
        },
        { status: 400 }
      );
    }

    // Check if there are any existing bookings for this ticket type
    const { data: bookingItems, error: bookingError } = await supabaseServer
      .from("booking_items")
      .select("id")
      .eq("ticket_type_id", ticketTypeId)
      .limit(1);

    if (bookingError) {
      console.error("Database error checking bookings:", bookingError);
      return NextResponse.json(
        { error: "Failed to check existing bookings" },
        { status: 500 }
      );
    }

    if (bookingItems && bookingItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete ticket type with existing bookings. Set it to inactive instead.",
        },
        { status: 400 }
      );
    }

    // Delete ticket type
    const { error: deleteError } = await supabaseServer
      .from("ticket_types")
      .delete()
      .eq("id", ticketTypeId)
      .eq("event_id", eventId); // Additional safety check

    if (deleteError) {
      console.error("Database error:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete ticket type: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Ticket type deleted successfully",
    });
  } catch (error) {
    console.error("Ticket type deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket type" },
      { status: 500 }
    );
  }
}
