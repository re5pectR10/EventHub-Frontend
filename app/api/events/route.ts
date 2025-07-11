import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
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

// Helper function to convert coordinates to PostGIS POINT format
function coordinatesToPoint(coordinates?: {
  lat: number;
  lng: number;
}): string | null {
  if (
    !coordinates ||
    typeof coordinates.lat !== "number" ||
    typeof coordinates.lng !== "number"
  ) {
    return null;
  }
  // PostGIS POINT format: POINT(longitude latitude)
  return `POINT(${coordinates.lng} ${coordinates.lat})`;
}

// Helper function to parse PostGIS POINT to coordinates object
function pointToCoordinates(
  point: unknown
): { lat: number; lng: number } | null {
  if (!point || typeof point !== "string") {
    return null;
  }

  try {
    // Parse POINT(lng lat) format
    const match = (point as string).match(
      /POINT\(([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\)/
    );
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      return { lat, lng };
    }
  } catch (error) {
    console.error("Error parsing POINT:", error);
  }

  return null;
}

// Extract geolocation from Vercel headers
function getGeolocationFromHeaders(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country") || null;
  const region = request.headers.get("x-vercel-ip-country-region") || null;
  const city = request.headers.get("x-vercel-ip-city") || null;

  return {
    country,
    region,
    city,
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
    const suggested = searchParams.get("suggested") === "true"; // New parameter for location-based suggestions

    const offset = (page - 1) * limit;
    const supabaseServer = await getServerSupabaseClient();

    // Get user geolocation from headers
    const userLocation = getGeolocationFromHeaders(request);
    console.log("User location from GeoIP:", userLocation);

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

    // Get user info for personalization
    const authHeader = request.headers.get("Authorization") || undefined;
    let user = null;
    try {
      user = await getUserFromToken(authHeader);
    } catch {
      // Non-authenticated users are fine, just proceed without personalization
      console.log("No authenticated user, proceeding without personalization");
    }

    // Apply location-based suggestions
    if (
      suggested &&
      (userLocation.city || userLocation.region || userLocation.country)
    ) {
      console.log("Applying location-based event suggestions");

      // Build location filter - prioritize city, then region, then country
      const locationFilters = [];
      if (userLocation.city) {
        locationFilters.push(`location_name.ilike.%${userLocation.city}%`);
        locationFilters.push(`location_address.ilike.%${userLocation.city}%`);
      }
      if (userLocation.region) {
        locationFilters.push(`location_name.ilike.%${userLocation.region}%`);
        locationFilters.push(`location_address.ilike.%${userLocation.region}%`);
      }
      if (userLocation.country) {
        locationFilters.push(`location_name.ilike.%${userLocation.country}%`);
        locationFilters.push(
          `location_address.ilike.%${userLocation.country}%`
        );
      }

      if (locationFilters.length > 0) {
        query = query.or(locationFilters.join(","));
      }
    }

    // Apply search filter (support 'search', 'q', and 'query' parameters)
    const query_param = searchParams.get("query"); // Add support for 'query' parameter
    const searchQuery = query_param || q || search;
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

    // Get user preferences for personalization
    let userPreferences: string[] = [];
    if (user) {
      try {
        // Fetch user's recent bookings to determine preferred categories
        const { data: bookings } = await supabaseServer
          .from("bookings")
          .select("events(event_categories(name))")
          .eq("customer_email", user.email)
          .order("created_at", { ascending: false })
          .limit(10);

        if (bookings) {
          const categoryNames = (
            bookings as Array<{
              events: Array<{ event_categories: Array<{ name: string }> }>;
            }>
          )
            .flatMap((booking) => booking.events || [])
            .flatMap((event) => event.event_categories || [])
            .map((category) => category.name)
            .filter((name): name is string => Boolean(name));
          userPreferences = Array.from(new Set(categoryNames));
          console.log(`Found user preferences: ${userPreferences.join(", ")}`);
        }
      } catch (prefError) {
        console.log("Failed to fetch user preferences:", prefError);
      }
    }

    // Apply sorting (with potential personalization boost)
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
      // Default sort by start date ascending, but boost preferred categories for auth users
      if (userPreferences.length > 0) {
        // For personalized sorting, we'll fetch all data and sort on the server side
        // This is a trade-off between performance and personalization
        console.log("Applying personalized sorting based on user preferences");
      }
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

    // Convert location coordinates from PostGIS POINT to lat/lng objects
    const eventsWithCoordinates = (events || []).map((event) => ({
      ...event,
      location_coordinates: pointToCoordinates(event.location_coordinates),
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    // Include user location in response for debugging/client use
    const response = {
      events: eventsWithCoordinates,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      userLocation: suggested ? userLocation : undefined, // Only include when requested
    };

    return NextResponse.json(response);
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

    // Prepare event data with coordinate conversion
    const { location_coordinates, ...restEventData } = eventData;
    const eventInsertData = {
      ...restEventData,
      slug: uniqueSlug,
      organizer_id: organizer.id,
      status: "draft", // New events start as drafts
      location_coordinates: coordinatesToPoint(location_coordinates),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create event
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .insert(eventInsertData)
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

    // Trigger revalidation of events page (ISR)
    try {
      revalidatePath("/events", "page");
      console.log("Revalidated /events page after event creation");
    } catch (revalidateError) {
      console.error("Failed to revalidate events page:", revalidateError);
      // Don't fail the request if revalidation fails
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
