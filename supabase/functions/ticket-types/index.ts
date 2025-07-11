import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors } from "jsr:@hono/hono/cors";
import type { HonoContext, User } from "../_shared/types.js";

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error ? null : user;
}

// Helper function to check if user is organizer of the event
async function isEventOrganizer(
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!organizer) return false;

  const { data: event } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .single();

  return event?.organizer_id === organizer.id;
}

// Create ticket type
app.post("/ticket-types", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const body = await c.req.json();
    const {
      event_id,
      name,
      description,
      price,
      quantity_available,
      sale_start_date,
      sale_end_date,
      max_per_order,
    } = body;

    // Validate required fields
    if (!event_id || !name || price === undefined || !quantity_available) {
      return c.json(
        { error: "Event ID, name, price, and quantity are required" },
        400
      );
    }

    // Check if user is organizer of the event
    const isOrganizer = await isEventOrganizer(user.id, event_id);
    if (!isOrganizer) {
      return c.json({ error: "Not authorized to manage this event" }, 403);
    }

    const ticketData = {
      event_id,
      name,
      description: description || null,
      price: parseFloat(price),
      quantity_available: parseInt(quantity_available),
      quantity_sold: 0,
      sale_start_date: sale_start_date || null,
      sale_end_date: sale_end_date || null,
      max_per_order: max_per_order ? parseInt(max_per_order) : null,
      created_at: new Date().toISOString(),
    };

    const { data: ticketType, error } = await supabase
      .from("ticket_types")
      .insert(ticketData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to create ticket type: ${error.message}`);
    }

    return c.json({ ticket_type: ticketType }, 201);
  } catch (error) {
    console.error("Ticket type creation error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create ticket type",
      },
      500
    );
  }
});

// Get ticket types for an event
app.get("/ticket-types/event/:eventId", async (c: HonoContext) => {
  try {
    const eventId = c.req.param("eventId");

    const { data: ticketTypes, error } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to fetch ticket types: ${error.message}`);
    }

    return c.json({ ticket_types: ticketTypes || [] });
  } catch (error) {
    console.error("Ticket types fetch error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch ticket types",
      },
      500
    );
  }
});

// Update ticket type
app.put("/ticket-types/:id", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const ticketTypeId = c.req.param("id");
    const body = await c.req.json();

    // Get the ticket type to check event ownership
    const { data: existingTicket, error: fetchError } = await supabase
      .from("ticket_types")
      .select("event_id")
      .eq("id", ticketTypeId)
      .single();

    if (fetchError || !existingTicket) {
      return c.json({ error: "Ticket type not found" }, 404);
    }

    // Check if user is organizer of the event
    const isOrganizer = await isEventOrganizer(
      user.id,
      existingTicket.event_id
    );
    if (!isOrganizer) {
      return c.json(
        { error: "Not authorized to manage this ticket type" },
        403
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

    const { data: ticketType, error } = await supabase
      .from("ticket_types")
      .update(updateData)
      .eq("id", ticketTypeId)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to update ticket type: ${error.message}`);
    }

    return c.json({ ticket_type: ticketType });
  } catch (error) {
    console.error("Ticket type update error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update ticket type",
      },
      500
    );
  }
});

// Delete ticket type
app.delete("/ticket-types/:id", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const ticketTypeId = c.req.param("id");

    // Get the ticket type to check event ownership
    const { data: existingTicket, error: fetchError } = await supabase
      .from("ticket_types")
      .select("event_id, quantity_sold")
      .eq("id", ticketTypeId)
      .single();

    if (fetchError || !existingTicket) {
      return c.json({ error: "Ticket type not found" }, 404);
    }

    // Check if user is organizer of the event
    const isOrganizer = await isEventOrganizer(
      user.id,
      existingTicket.event_id
    );
    if (!isOrganizer) {
      return c.json(
        { error: "Not authorized to manage this ticket type" },
        403
      );
    }

    // Check if any tickets have been sold
    if (existingTicket.quantity_sold > 0) {
      return c.json(
        { error: "Cannot delete ticket type with sold tickets" },
        400
      );
    }

    const { error } = await supabase
      .from("ticket_types")
      .delete()
      .eq("id", ticketTypeId);

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to delete ticket type: ${error.message}`);
    }

    return c.json({ message: "Ticket type deleted successfully" });
  } catch (error) {
    console.error("Ticket type deletion error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete ticket type",
      },
      500
    );
  }
});

// Health check
app.get("/ticket-types/health", (c: HonoContext) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
