import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Helper function to check if user is organizer
async function isUserOrganizer(userId: string): Promise<boolean> {
  const supabaseServer = await getServerSupabaseClient();
  const { data: organizer } = await supabaseServer
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .single();

  return !!organizer;
}

// GET /api/tickets/[id] - Get ticket details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;

    const supabaseServer = await getServerSupabaseClient();
    const { data: ticket, error } = await supabaseServer
      .from("tickets")
      .select(
        `
        *,
        bookings(
          id,
          booking_code,
          customer_name,
          customer_email,
          status
        ),
        ticket_types(
          id,
          name,
          description,
          price
        ),
        events:bookings(
          events(
            id,
            title,
            start_date,
            start_time,
            location_name
          )
        )
      `
      )
      .eq("id", ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Update ticket status (organizers only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is an organizer
    const isOrganizer = await isUserOrganizer(user.id);
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    const { status } = await request.json();

    if (!status || !["valid", "used", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be valid, used, or cancelled" },
        { status: 400 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Verify ticket exists and user has permission
    const { data: ticket, error: ticketError } = await supabaseServer
      .from("tickets")
      .select(
        `
        id,
        bookings(
          events(
            organizer_id,
            organizers(user_id)
          )
        )
      `
      )
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check ownership through the event organizer
    const eventOrganizerUserId = (ticket.bookings as any)?.events?.organizers
      ?.user_id;
    if (eventOrganizerUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this ticket" },
        { status: 403 }
      );
    }

    // Update ticket status
    const { data: updatedTicket, error: updateError } = await supabaseServer
      .from("tickets")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === "used" && { used_at: new Date().toISOString() }),
      })
      .eq("id", ticketId)
      .select()
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: `Failed to update ticket status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ticket: updatedTicket,
      message: `Ticket status updated to ${status}`,
    });
  } catch (error) {
    console.error("Ticket update error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket status" },
      { status: 500 }
    );
  }
}
