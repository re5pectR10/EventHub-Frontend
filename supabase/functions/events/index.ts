import { Hono } from "https://deno.land/x/hono@v3.12.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { cors } from "https://deno.land/x/hono@v3.12.8/middleware.ts";
import type {
  HonoContext,
  User,
  CreateEventRequest,
  EventsQueryParams,
} from "../_shared/types.js";

const app = new Hono();

// Configure CORS
app.use(
  "/*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://event-hub-frontend-five.vercel.app",
    ],
    credentials: true,
  })
);

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get user from JWT
async function getUser(authHeader: string | undefined): Promise<User | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    return error ? null : user;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Helper function to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Get all events with search and filtering
app.get("/events", async (c: HonoContext) => {
  try {
    const query = c.req.query() as EventsQueryParams;

    let dbQuery = supabase
      .from("events")
      .select(
        `
        *,
        organizers(business_name, contact_email),
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
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
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return c.json({
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
    return c.json({ error: "Failed to fetch events" }, 500);
  }
});

// Get featured events
app.get("/events/featured", async (c: HonoContext) => {
  try {
    const { data: events, error } = await supabase
      .from("events")
      .select(
        `
        *,
        organizers(business_name),
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price)
      `
      )
      .eq("status", "published")
      .eq("featured", true)
      .order("start_date", { ascending: true })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch featured events: ${error.message}`);
    }

    return c.json({ events });
  } catch (error) {
    console.error("Featured events fetch error:", error);
    return c.json({ error: "Failed to fetch featured events" }, 500);
  }
});

// Get organizer's own events (authenticated)
app.get("/events/my-events", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Check if user is an organizer
    const { data: organizer, error: organizerError } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (organizerError || !organizer) {
      return c.json({ error: "Organizer profile required" }, 403);
    }

    const { data: events, error } = await supabase
      .from("events")
      .select(
        `
        *,
        organizers(business_name, contact_email),
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
      )
      .eq("organizer_id", organizer.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organizer events: ${error.message}`);
    }

    return c.json({ events });
  } catch (error) {
    console.error("Organizer events fetch error:", error);
    return c.json({ error: "Failed to fetch organizer events" }, 500);
  }
});

// Get single event by slug - SPECIFIC ROUTE FOR SLUG ACCESS
app.get("/events/slug/:slug", async (c: HonoContext) => {
  try {
    const slug = c.req.param("slug");
    const user = await getUser(c.req.header("Authorization"));

    console.log(`[SLUG ROUTE] Looking for event with slug: ${slug}`);

    let query = supabase
      .from("events")
      .select(
        `
        *,
        organizers(id, business_name, contact_email, description, website),
        event_categories(name, slug),
        event_images(image_url, alt_text, display_order, is_primary),
        ticket_types(*)
      `
      )
      .eq("slug", slug);

    // If user is authenticated, check if they own the event
    if (user) {
      const { data: organizer } = await supabase
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
            `[SLUG ROUTE] Found organizer's own event: ${ownEvent.title}`
          );
          return c.json({ event: ownEvent });
        }
      }
    }

    // For public access, only show published events
    const { data: event, error } = await query
      .eq("status", "published")
      .single();

    if (error || !event) {
      console.log(
        `[SLUG ROUTE] Event not found for slug: ${slug}, error:`,
        error
      );
      return c.json({ error: "Event not found" }, 404);
    }

    console.log(`[SLUG ROUTE] Found published event: ${event.title}`);
    return c.json({ event });
  } catch (error) {
    console.error("[SLUG ROUTE] Event fetch error:", error);
    return c.json({ error: "Failed to fetch event" }, 500);
  }
});

// Get single event by ID or slug - UNIFIED ROUTE
app.get("/events/:identifier", async (c: HonoContext) => {
  try {
    const identifier = c.req.param("identifier");
    const user = await getUser(c.req.header("Authorization"));

    console.log(
      `[UNIFIED ROUTE] Looking for event with identifier: ${identifier}`
    );

    // Check if identifier is a UUID or a slug
    const isUUID = isValidUUID(identifier);

    let query = supabase.from("events").select(
      `
        *,
        organizers(id, business_name, contact_email, description, website),
        event_categories(name, slug),
        event_images(image_url, alt_text, display_order, is_primary),
        ticket_types(*)
      `
    );

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
      const { data: organizer } = await supabase
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
          return c.json({ event: ownEvent });
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
      return c.json({ error: "Event not found" }, 404);
    }

    console.log(`[UNIFIED ROUTE] Found published event: ${event.title}`);
    return c.json({ event });
  } catch (error) {
    console.error("[UNIFIED ROUTE] Event fetch error:", error);
    return c.json({ error: "Failed to fetch event" }, 500);
  }
});

// Create new event (authenticated organizers only)
app.post("/events", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Check if user is an organizer
    const { data: organizer, error: organizerError } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (organizerError || !organizer) {
      return c.json({ error: "Organizer profile required" }, 403);
    }

    const eventData: CreateEventRequest = await c.req.json();

    // Validate required fields
    if (!eventData.title || !eventData.start_date || !eventData.category_id) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Generate slug from title
    const slug = eventData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Create event
    const { data: event, error: eventError } = await supabase
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
      throw new Error(`Failed to create event: ${eventError.message}`);
    }

    // Create ticket types if provided
    if (eventData.ticket_types && eventData.ticket_types.length > 0) {
      const ticketTypesData = eventData.ticket_types.map((ticketType) => ({
        ...ticketType,
        event_id: event.id,
        quantity_sold: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: ticketTypesError } = await supabase
        .from("ticket_types")
        .insert(ticketTypesData);

      if (ticketTypesError) {
        console.error("Failed to create ticket types:", ticketTypesError);
        // Don't fail the entire request, just log the error
      }
    }

    return c.json({ event }, 201);
  } catch (error) {
    console.error("Event creation error:", error);
    return c.json({ error: "Failed to create event" }, 500);
  }
});

// Update event (authenticated organizers only)
app.put("/events/:id", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const eventId = c.req.param("id");
    const updateData: Partial<CreateEventRequest> & { status?: string } =
      await c.req.json();

    // Check if user owns this event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("organizer_id, organizers(user_id)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return c.json({ error: "Event not found" }, 404);
    }

    if ((event.organizers as any)?.user_id !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Update event
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    return c.json({ event: updatedEvent });
  } catch (error) {
    console.error("Event update error:", error);
    return c.json({ error: "Failed to update event" }, 500);
  }
});

// Update event status (authenticated organizers only)
app.patch("/events/:id/status", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const eventId = c.req.param("id");
    const { status } = await c.req.json();

    // Validate status
    if (!["draft", "published", "cancelled"].includes(status)) {
      return c.json(
        { error: "Invalid status. Must be draft, published, or cancelled" },
        400
      );
    }

    // Check if user owns this event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("organizer_id, organizers(user_id)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return c.json({ error: "Event not found" }, 404);
    }

    if ((event.organizers as any)?.user_id !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Update event status
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update event status: ${updateError.message}`);
    }

    return c.json({ event: updatedEvent });
  } catch (error) {
    console.error("Event status update error:", error);
    return c.json({ error: "Failed to update event status" }, 500);
  }
});

// Delete event (authenticated organizers only)
app.delete("/events/:id", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const eventId = c.req.param("id");

    // Check if user owns this event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("organizer_id, organizers(user_id)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return c.json({ error: "Event not found" }, 404);
    }

    if ((event.organizers as any)?.user_id !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Delete event (this will cascade to related records)
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      throw new Error(`Failed to delete event: ${deleteError.message}`);
    }

    return c.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Event deletion error:", error);
    return c.json({ error: "Failed to delete event" }, 500);
  }
});

// Create ticket type for event
app.post("/events/:id/ticket-types", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const eventId = c.req.param("id");

    // Check if user owns this event
    const { data: organizer } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!organizer) {
      return c.json({ error: "Organizer profile required" }, 403);
    }

    // Verify event ownership
    const { data: existingEvent } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (!existingEvent || existingEvent.organizer_id !== organizer.id) {
      return c.json({ error: "Event not found or unauthorized" }, 404);
    }

    const body = await c.req.json();
    const ticketTypeData = {
      ...body,
      event_id: eventId,
      created_at: new Date().toISOString(),
    };

    const { data: ticketType, error } = await supabase
      .from("ticket_types")
      .insert(ticketTypeData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ticket type: ${error.message}`);
    }

    return c.json({ ticketType }, 201);
  } catch (error) {
    console.error("Ticket type creation error:", error);
    return c.json({ error: "Failed to create ticket type" }, 500);
  }
});

Deno.serve(app.fetch);
