import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors } from "jsr:@hono/hono/cors";
import type {
  HonoContext,
  User,
  Organizer,
  CreateOrganizerRequest,
  ApiResponse,
} from "../_shared/types.js";

const app = new Hono();

// Configure CORS
app.use(
  "/*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://event-hub-frontend-five.vercel.app",
    ], // Add your domains
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

// Get all organizers (public endpoint)
app.get("/organizers", async (c: HonoContext) => {
  try {
    const { data: organizers, error } = await supabase
      .from("organizers")
      .select(
        `
        id,
        business_name,
        description,
        contact_email,
        website,
        logo_url,
        location,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organizers: ${error.message}`);
    }

    // Add events count for each organizer
    const organizersWithCount = await Promise.all(
      (organizers || []).map(async (organizer: any) => {
        const { count, error: countError } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "published");

        return {
          ...organizer,
          name: organizer.business_name,
          events_count: countError ? 0 : count || 0,
        };
      })
    );

    return c.json({ data: organizersWithCount });
  } catch (error) {
    console.error("Organizers fetch error:", error);
    return c.json({ error: "Failed to fetch organizers" }, 500);
  }
});

// Get organizer profile (must come before /:id route)
app.get("/organizers/profile", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const { data: organizer, error } = await supabase
      .from("organizers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch organizer profile: ${error.message}`);
    }

    return c.json({ organizer: organizer || null });
  } catch (error) {
    console.error("Organizer profile fetch error:", error);
    return c.json({ error: "Failed to fetch organizer profile" }, 500);
  }
});

// Get organizer by ID (public endpoint)
app.get("/organizers/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Organizer ID is required" }, 400);
    }

    const { data: organizer, error } = await supabase
      .from("organizers")
      .select(
        `
        id,
        business_name,
        description,
        contact_email,
        website,
        logo_url,
        location,
        verification_status,
        created_at,
        updated_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return c.json({ error: "Organizer not found" }, 404);
      }
      throw new Error(`Failed to fetch organizer: ${error.message}`);
    }

    // Add events count for this organizer
    const { count, error: countError } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", organizer.id)
      .eq("status", "published");

    const organizerWithCount = {
      ...organizer,
      name: organizer.business_name,
      events_count: countError ? 0 : count || 0,
    };

    return c.json({ data: organizerWithCount });
  } catch (error) {
    console.error("Organizer fetch error:", error);
    return c.json({ error: "Failed to fetch organizer" }, 500);
  }
});

// Create organizer profile
app.post("/organizers/profile", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Check if organizer profile already exists
    const { data: existingOrganizer } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingOrganizer) {
      return c.json({ error: "Organizer profile already exists" }, 409);
    }

    const body: CreateOrganizerRequest = await c.req.json();

    // Validate required fields
    if (!body.business_name || !body.contact_email) {
      return c.json(
        { error: "Business name and contact email are required" },
        400
      );
    }

    const organizerData = {
      business_name: body.business_name,
      description: body.description || null,
      contact_email: body.contact_email,
      website: body.website || null,
      logo_url: body.logo_url || null,
      location: body.location || null,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: organizer, error } = await supabase
      .from("organizers")
      .insert(organizerData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to create organizer profile: ${error.message}`);
    }

    return c.json({ organizer }, 201);
  } catch (error) {
    console.error("Organizer profile creation error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create organizer profile",
      },
      500
    );
  }
});

// Update organizer profile
app.put("/organizers/profile", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const body: Partial<CreateOrganizerRequest> = await c.req.json();

    // Only update allowed fields
    const updateData: Partial<Organizer> = {
      business_name: body.business_name,
      description: body.description,
      contact_email: body.contact_email,
      website: body.website,
      logo_url: body.logo_url,
      location: body.location,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof Organizer] === undefined) {
        delete updateData[key as keyof Organizer];
      }
    });

    const { data: organizer, error } = await supabase
      .from("organizers")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to update organizer profile: ${error.message}`);
    }

    return c.json({ organizer });
  } catch (error) {
    console.error("Organizer profile update error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update organizer profile",
      },
      500
    );
  }
});

// Get organizer's events
app.get("/organizers/events", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const { data: organizer, error: organizerError } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (organizerError || !organizer) {
      return c.json({ error: "Organizer profile not found" }, 404);
    }

    const { data: events, error } = await supabase
      .from("events")
      .select(
        `
        *,
        event_categories(name, slug),
        event_images(image_url, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
      )
      .eq("organizer_id", organizer.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return c.json({ events });
  } catch (error) {
    console.error("Organizer events fetch error:", error);
    return c.json({ error: "Failed to fetch events" }, 500);
  }
});

Deno.serve(app.fetch);
