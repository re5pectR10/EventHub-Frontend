import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Generate unique slug by checking database
async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>,
  baseSlug: string,
  eventId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase.from("events").select("slug").eq("slug", slug);

    // If updating an existing event, exclude it from the check
    if (eventId) {
      query = query.neq("id", eventId);
    }

    const { data: existingEvent } = await query.single();

    if (!existingEvent) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Helper function to sanitize timestamp fields
function sanitizeTicketTimestampFields(ticket: {
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  sale_start_date?: string;
  sale_end_date?: string;
  max_per_order?: number;
}) {
  return {
    ...ticket,
    sale_start_date: ticket.sale_start_date?.trim() || null,
    sale_end_date: ticket.sale_end_date?.trim() || null,
  };
}

// Get all events with search and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const q = searchParams.get("q"); // New query parameter
    const location = searchParams.get("location");
    const sort = searchParams.get("sort"); // New sort parameter
    const dateFrom = searchParams.get("dateFrom"); // New date range parameter
    const dateTo = searchParams.get("dateTo"); // New date range parameter

    const offset = (page - 1) * limit;
    const supabaseServer = await getServerSupabaseClient();

    // Build query
    let query = supabaseServer
      .from("events")
      .select(
        `
        *,
        organizers(id, business_name, contact_email, description, website),
        event_categories(name, slug),
        event_images(image_url, alt_text, display_order, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `,
        { count: "exact" }
      )
      .eq("status", "published");

    // Apply category filter
    if (category) {
      query = query.eq("event_categories.slug", category);
    }

    // Apply search filter (support both 'search' and 'q' parameters)
    const searchQuery = q || search;
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`
      );
    }

    // Apply location filter
    if (location) {
      query = query.ilike("location_name", `%${location}%`);
    }

    // Apply date range filters
    if (dateFrom) {
      query = query.gte("start_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("start_date", dateTo);
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case "date_asc":
          query = query.order("start_date", { ascending: true });
          break;
        case "date_desc":
          query = query.order("start_date", { ascending: false });
          break;
        case "price_asc":
          // For price sorting, we'll need to order by the minimum ticket price
          // This is a simplified approach - in production you might want to use a computed column
          query = query.order("start_date", { ascending: true }); // Fallback to date
          break;
        case "price_desc":
          // For price sorting, we'll need to order by the minimum ticket price
          // This is a simplified approach - in production you might want to use a computed column
          query = query.order("start_date", { ascending: true }); // Fallback to date
          break;
        default:
          query = query.order("start_date", { ascending: true });
      }
    } else {
      // Default sort by start date ascending
      query = query.order("start_date", { ascending: true });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch events: ${error.message}` },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      events: events || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// Create new event (authenticated organizers only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { event: eventData, tickets = [] } = await request.json();
    const supabaseServer = await getServerSupabaseClient();

    // Check if user is an organizer
    const { data: organizer, error: organizerError } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!eventData.title) {
      return NextResponse.json(
        { error: "Event title is required" },
        { status: 400 }
      );
    }

    // Generate unique slug from title
    const baseSlug = generateSlug(eventData.title);
    const uniqueSlug = await generateUniqueSlug(supabaseServer, baseSlug);

    // Create event
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .insert({
        ...eventData,
        slug: uniqueSlug,
        organizer_id: organizer.id,
        status: "draft", // New events start as drafts
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (eventError) {
      console.error("Database error:", eventError);
      return NextResponse.json(
        { error: `Failed to create event: ${eventError.message}` },
        { status: 500 }
      );
    }

    // Create ticket types if provided
    let createdTickets = [];
    if (tickets.length > 0 && event?.id) {
      // Validate ticket data
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (!ticket.name?.trim()) {
          return NextResponse.json(
            { error: `Ticket ${i + 1}: Name is required` },
            { status: 400 }
          );
        }
        if (ticket.price < 0) {
          return NextResponse.json(
            { error: `Ticket ${i + 1}: Price cannot be negative` },
            { status: 400 }
          );
        }
        if (!ticket.quantity_available || ticket.quantity_available <= 0) {
          return NextResponse.json(
            { error: `Ticket ${i + 1}: Quantity must be greater than 0` },
            { status: 400 }
          );
        }
      }

      // Prepare ticket data for insertion
      const ticketsToInsert = tickets.map(
        (ticket: {
          name: string;
          description?: string;
          price: number;
          quantity_available: number;
          sale_start_date?: string;
          sale_end_date?: string;
          max_per_order?: number;
        }) => {
          const sanitizedTicket = sanitizeTicketTimestampFields(ticket);
          return {
            ...sanitizedTicket,
            event_id: event.id,
            quantity_sold: 0,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      );

      const { data: ticketData, error: ticketError } = await supabaseServer
        .from("ticket_types")
        .insert(ticketsToInsert)
        .select();

      if (ticketError) {
        console.error("Ticket creation error:", ticketError);
        // If tickets fail to create, we should delete the event to maintain consistency
        await supabaseServer.from("events").delete().eq("id", event.id);
        return NextResponse.json(
          { error: `Failed to create tickets: ${ticketError.message}` },
          { status: 500 }
        );
      }

      createdTickets = ticketData || [];
    }

    return NextResponse.json(
      {
        event: {
          ...event,
          ticket_types: createdTickets,
        },
        tickets: createdTickets,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
