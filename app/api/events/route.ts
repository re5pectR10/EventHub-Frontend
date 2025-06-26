import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromToken } from "../../../lib/supabase-server";

interface EventsQueryParams {
  query?: string;
  category?: string;
  featured?: string;
  date_from?: string;
  date_to?: string;
  location?: string;
  sort?: "date_asc" | "date_desc" | "price_asc" | "price_desc";
  page?: string;
  limit?: string;
}

// Get all events with search and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query: EventsQueryParams = {
      query: searchParams.get("query") || undefined,
      category: searchParams.get("category") || undefined,
      featured: searchParams.get("featured") || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      location: searchParams.get("location") || undefined,
      sort:
        (searchParams.get("sort") as EventsQueryParams["sort"]) || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    let dbQuery = supabaseServer
      .from("events")
      .select(
        `
        *,
        organizers(business_name, contact_email),
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `,
        { count: "exact" }
      )
      .eq("status", "published");

    // Apply filters
    if (query.query) {
      dbQuery = dbQuery.or(
        `title.ilike.%${query.query}%,description.ilike.%${query.query}%`
      );
    }

    if (query.category) {
      dbQuery = dbQuery.eq("category_id", query.category);
    }

    if (query.featured !== undefined) {
      dbQuery = dbQuery.eq("featured", query.featured === "true");
    }

    if (query.date_from) {
      dbQuery = dbQuery.gte("start_date", query.date_from);
    }

    if (query.date_to) {
      dbQuery = dbQuery.lte("start_date", query.date_to);
    }

    if (query.location) {
      dbQuery = dbQuery.or(
        `location_name.ilike.%${query.location}%,location_address.ilike.%${query.location}%`
      );
    }

    // Sorting
    switch (query.sort) {
      case "date_asc":
        dbQuery = dbQuery.order("start_date", { ascending: true });
        break;
      case "date_desc":
        dbQuery = dbQuery.order("start_date", { ascending: false });
        break;
      case "price_asc":
        dbQuery = dbQuery.order("ticket_types.price", { ascending: true });
        break;
      case "price_desc":
        dbQuery = dbQuery.order("ticket_types.price", { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order("start_date", { ascending: true });
    }

    // Pagination
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const offset = (page - 1) * limit;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: events, error, count } = await dbQuery;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Failed to fetch events: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
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

    // Check if user is an organizer
    const { data: organizer, error: organizerError } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json(
        { error: "Organizer profile required" },
        { status: 403 }
      );
    }

    const eventData = await request.json();

    // Validate required fields
    if (!eventData.title || !eventData.start_date || !eventData.category_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = eventData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Create event
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .insert({
        ...eventData,
        slug,
        organizer_id: organizer.id,
        status: "draft",
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
    if (eventData.ticket_types && eventData.ticket_types.length > 0) {
      const ticketTypesData = eventData.ticket_types.map((ticketType: any) => ({
        ...ticketType,
        event_id: event.id,
        quantity_sold: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: ticketTypesError } = await supabaseServer
        .from("ticket_types")
        .insert(ticketTypesData);

      if (ticketTypesError) {
        console.error("Failed to create ticket types:", ticketTypesError);
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
