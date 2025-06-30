import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "../../../lib/supabase-server";

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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const location = searchParams.get("location");

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
      .eq("status", "published")
      .order("start_date", { ascending: true });

    // Apply filters
    if (category) {
      query = query.eq("event_categories.slug", category);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,location_name.ilike.%${search}%`
      );
    }

    if (location) {
      query = query.ilike("location_name", `%${location}%`);
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

    const eventData = await request.json();
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

    // Create event
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .insert({
        ...eventData,
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

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
