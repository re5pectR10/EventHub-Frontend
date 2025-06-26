import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../lib/supabase-server";

// Helper function to check if user is organizer of the event
async function isEventOrganizer(
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data: organizer } = await supabaseServer
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!organizer) return false;

  const { data: event } = await supabaseServer
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .single();

  return event?.organizer_id === organizer.id;
}

// Get ticket type by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketTypeId } = await params;

    const { data: ticketType, error } = await supabaseServer
      .from("ticket_types")
      .select("*")
      .eq("id", ticketTypeId)
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

// Update ticket type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: ticketTypeId } = await params;
    const body = await request.json();

    // Get the ticket type to check event ownership
    const { data: existingTicket, error: fetchError } = await supabaseServer
      .from("ticket_types")
      .select("event_id")
      .eq("id", ticketTypeId)
      .single();

    if (fetchError || !existingTicket) {
      return NextResponse.json(
        { error: "Ticket type not found" },
        { status: 404 }
      );
    }

    // Check if user is organizer of the event
    const isOrganizer = await isEventOrganizer(
      user.id,
      existingTicket.event_id
    );
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Not authorized to manage this ticket type" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.quantity_available !== undefined)
      updateData.quantity_available = parseInt(body.quantity_available);
    if (body.sale_start_date !== undefined)
      updateData.sale_start_date = body.sale_start_date;
    if (body.sale_end_date !== undefined)
      updateData.sale_end_date = body.sale_end_date;
    if (body.max_per_order !== undefined)
      updateData.max_per_order = body.max_per_order
        ? parseInt(body.max_per_order)
        : null;

    const { data: ticketType, error } = await supabaseServer
      .from("ticket_types")
      .update(updateData)
      .eq("id", ticketTypeId)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to update ticket type: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticket_type: ticketType });
  } catch (error) {
    console.error("Ticket type update error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket type" },
      { status: 500 }
    );
  }
}

// Delete ticket type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: ticketTypeId } = await params;

    // Get the ticket type to check event ownership
    const { data: existingTicket, error: fetchError } = await supabaseServer
      .from("ticket_types")
      .select("event_id, quantity_sold")
      .eq("id", ticketTypeId)
      .single();

    if (fetchError || !existingTicket) {
      return NextResponse.json(
        { error: "Ticket type not found" },
        { status: 404 }
      );
    }

    // Check if user is organizer of the event
    const isOrganizer = await isEventOrganizer(
      user.id,
      existingTicket.event_id
    );
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Not authorized to manage this ticket type" },
        { status: 403 }
      );
    }

    // Check if any tickets have been sold
    if (existingTicket.quantity_sold > 0) {
      return NextResponse.json(
        { error: "Cannot delete ticket type with sold tickets" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("ticket_types")
      .delete()
      .eq("id", ticketTypeId);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to delete ticket type: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Ticket type deleted successfully" });
  } catch (error) {
    console.error("Ticket type deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket type" },
      { status: 500 }
    );
  }
}
