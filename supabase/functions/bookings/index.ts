import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors } from "jsr:@hono/hono/cors";
import type {
  HonoContext,
  User,
  CreateBookingRequest,
  BookingItemRequest,
} from "../_shared/types.js";

const app = new Hono();

// Add request logging middleware
app.use("*", async (c, next) => {
  const { method, url } = c.req;
  const path = new URL(url).pathname;
  console.log(`📥 INCOMING REQUEST: ${method} ${path}`);
  console.log(`📍 Full URL: ${url}`);

  await next();

  console.log(`📤 RESPONSE STATUS: ${c.res.status}`);
});

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

// Stripe configuration
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

// Helper function to get user from JWT
async function getUser(authHeader: string | undefined): Promise<User | null> {
  console.log("🔐 getUser called");
  console.log("🔑 Auth header type:", typeof authHeader);
  console.log("🔑 Auth header present:", !!authHeader);
  console.log(
    "🔑 Auth header starts with Bearer:",
    authHeader?.startsWith("Bearer ")
  );

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("❌ No valid Bearer token found");
    return null;
  }

  const token = authHeader.substring(7);
  console.log("🎯 Token length:", token.length);
  console.log("🎯 Token preview:", token.substring(0, 20) + "...");

  try {
    console.log("🔍 Calling supabase.auth.getUser...");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    console.log("📊 Supabase auth result:", {
      hasUser: !!user,
      userId: user?.id,
      error: error ? error.message : null,
    });

    if (error) {
      console.error("❌ Error getting user from token:", error);
      return null;
    }

    if (!user) {
      console.log("❌ No user returned from token");
      return null;
    }

    console.log(`✅ User authenticated successfully: ${user.id}`);
    return user;
  } catch (err) {
    console.error("💥 Exception in getUser:", err);
    return null;
  }
}

// Get user's bookings (legacy route with /bookings prefix)
app.get("/bookings", async (c: HonoContext) => {
  console.log("🔥 LEGACY BOOKINGS ROUTE (/bookings) called");
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      console.log("❌ No user found for legacy bookings route");
      return c.json({ error: "Authentication required" }, 401);
    }
    console.log(
      "✅ User found for legacy bookings route, fetching bookings..."
    );

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        events(title, start_date, start_time, location_name),
        booking_items(
          quantity,
          unit_price,
          total_price,
          ticket_types(name)
        ),
        tickets(id, ticket_code, qr_code, status)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }

    return c.json({ bookings });
  } catch (error) {
    console.error("Legacy bookings fetch error:", error);
    return c.json({ error: "Failed to fetch bookings" }, 500);
  }
});

// Get all bookings for an organizer's events (legacy route with /bookings prefix)
app.get("/bookings/organizer", async (c) => {
  console.log("🔥 LEGACY ORGANIZER ROUTE (/bookings/organizer) called");

  try {
    console.log("🔐 Checking authorization header...");
    const authHeader = c.req.header("authorization");
    console.log("🔑 Auth header present:", !!authHeader);

    const user = await getUser(authHeader);
    if (!user) {
      console.log("❌ No user found for legacy organizer route");
      return c.json({ error: "Authentication required" }, 401);
    }
    console.log(`✅ User authenticated: ${user.id}`);

    console.log("🏢 Checking if user is an organizer...");
    const organizer = await getOrganizer(user.id);

    if (!organizer) {
      console.log("❌ User is not an organizer");
      return c.json({ error: "User is not an organizer" }, 403);
    }

    console.log(`✅ User is organizer with ID: ${organizer.id}`);

    console.log("📊 Fetching bookings for organizer events...");
    // Get all bookings for events owned by this organizer
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        events!inner (
          id,
          title,
          start_date,
          start_time,
          location_name,
          organizer_id
        ),
        booking_items (
          quantity,
          unit_price,
          total_price,
          ticket_types (
            name,
            description
          )
        ),
        tickets (
          id,
          ticket_code,
          qr_code,
          status,
          scanned_at
        )
      `
      )
      .eq("events.organizer_id", organizer.id)
      .order("created_at", { ascending: false });

    console.log(`📈 Bookings query result:`, {
      bookingsCount: bookings?.length || 0,
      error: error ? error.message : null,
    });

    if (error) {
      console.error("❌ Error fetching organizer bookings:", error);
      return c.json({ error: "Failed to fetch bookings" }, 500);
    }

    console.log(`✅ Successfully fetched ${bookings?.length || 0} bookings`);
    return c.json({
      bookings: bookings || [],
    });
  } catch (error) {
    console.error("💥 Exception in /bookings/organizer endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get specific booking (legacy route with /bookings prefix)
app.get("/bookings/:id", async (c: HonoContext) => {
  console.log("🔥 LEGACY BOOKING ID ROUTE (/bookings/:id) called");
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      console.log("❌ No user found for legacy booking ID route");
      return c.json({ error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    console.log(
      `✅ User found for legacy booking ID route, fetching booking ${id}...`
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        events(title, start_date, start_time, location_name, location_address),
        booking_items(
          quantity,
          unit_price,
          total_price,
          ticket_types(name, description)
        ),
        tickets(id, ticket_code, qr_code, status, scanned_at)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    return c.json({ booking });
  } catch (error) {
    console.error("Legacy booking fetch error:", error);
    return c.json({ error: "Failed to fetch booking" }, 500);
  }
});

// Create new booking with Stripe checkout (public endpoint - authentication optional)
app.post("/bookings", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    // Note: User authentication is optional for booking creation
    // Bookings can be created by anonymous users with just email/name

    const bookingData: CreateBookingRequest = await c.req.json();
    const { event_id, items, customer_name, customer_email, customer_phone } =
      bookingData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: "At least one ticket item is required" }, 400);
    }

    // Validate event exists and is bookable
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, status, start_date")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return c.json({ error: "Event not found" }, 404);
    }

    if (event.status !== "published") {
      return c.json({ error: "Event is not available for booking" }, 400);
    }

    // Check if event is in the future
    if (new Date(event.start_date) < new Date()) {
      return c.json({ error: "Cannot book past events" }, 400);
    }

    let totalPrice = 0;
    const validatedItems: Array<
      BookingItemRequest & { unit_price: number; total_price: number }
    > = [];

    // Validate each item and calculate total
    for (const item of items) {
      const { data: ticketType, error: ticketError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("id", item.ticket_type_id)
        .eq("event_id", event_id)
        .single();

      if (ticketError || !ticketType) {
        return c.json(
          { error: `Ticket type ${item.ticket_type_id} not found` },
          404
        );
      }

      const availableQuantity =
        ticketType.quantity_available - ticketType.quantity_sold;
      if (item.quantity > availableQuantity) {
        return c.json(
          {
            error: `Only ${availableQuantity} tickets available for ${ticketType.name}`,
          },
          400
        );
      }

      if (
        ticketType.max_per_order &&
        item.quantity > ticketType.max_per_order
      ) {
        return c.json(
          {
            error: `Maximum ${ticketType.max_per_order} tickets per order for ${ticketType.name}`,
          },
          400
        );
      }

      const itemTotal = ticketType.price * item.quantity;
      totalPrice += itemTotal;

      validatedItems.push({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: ticketType.price,
        total_price: itemTotal,
      });
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user?.id || null, // Allow null for anonymous bookings
        event_id,
        status: "pending",
        total_price: totalPrice,
        customer_name,
        customer_email,
        customer_phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    // Create booking items
    const bookingItemsData = validatedItems.map((item) => ({
      booking_id: booking.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase
      .from("booking_items")
      .insert(bookingItemsData);

    if (itemsError) {
      // Rollback booking if items creation fails
      await supabase.from("bookings").delete().eq("id", booking.id);
      throw new Error(`Failed to create booking items: ${itemsError.message}`);
    }

    // Create Stripe checkout session
    try {
      const checkoutUrl = await createStripeCheckoutSession(
        booking,
        validatedItems,
        event
      );
      return c.json({ booking, checkout_url: checkoutUrl }, 201);
    } catch (stripeError) {
      console.error("Stripe checkout error:", stripeError);
      return c.json(
        {
          booking,
          error:
            "Booking created but payment setup failed. Please contact support.",
        },
        201
      );
    }
  } catch (error) {
    console.error("Booking creation error:", error);
    return c.json({ error: "Failed to create booking" }, 500);
  }
});

// Helper function to create Stripe checkout session
async function createStripeCheckoutSession(
  booking: any,
  items: Array<
    BookingItemRequest & { unit_price: number; total_price: number }
  >,
  event: any
): Promise<string> {
  // This is a simplified version - you'll need to implement actual Stripe integration
  // For now, return a placeholder URL
  const checkoutUrl = `${Deno.env.get("FRONTEND_URL")}/checkout/${booking.id}`;
  return checkoutUrl;
}

// Cancel booking
app.delete("/bookings/:id", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const bookingId = c.req.param("id");

    // Check if booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();

    if (bookingError || !booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    if (booking.status === "cancelled") {
      return c.json({ error: "Booking is already cancelled" }, 400);
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(`Failed to cancel booking: ${updateError.message}`);
    }

    return c.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    return c.json({ error: "Failed to cancel booking" }, 500);
  }
});

// Get organizer from user ID
async function getOrganizer(userId: string) {
  console.log(`🔍 getOrganizer called with userId: ${userId}`);

  try {
    const { data: organizer, error } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", userId)
      .single();

    console.log(`📊 getOrganizer query result:`, { organizer, error });

    if (error) {
      console.log(`❌ getOrganizer error:`, error);
      if (error.code === "PGRST116") {
        console.log(
          `ℹ️ No organizer found for user ${userId} (this is normal if user is not an organizer)`
        );
      } else {
        console.log(`⚠️ Unexpected error in getOrganizer:`, error);
      }
      return null;
    }

    if (!organizer) {
      console.log(`ℹ️ getOrganizer returned null data for user ${userId}`);
      return null;
    }

    console.log(`✅ getOrganizer found organizer:`, organizer);
    return organizer;
  } catch (err) {
    console.error(`💥 Exception in getOrganizer:`, err);
    return null;
  }
}

// Get all bookings for an organizer's events (modern route without prefix)
app.get("/organizer", async (c) => {
  console.log("🔥 ORGANIZER ROUTE (/organizer) called");

  try {
    console.log("🔐 Checking authorization header...");
    const authHeader = c.req.header("authorization");
    console.log("🔑 Auth header present:", !!authHeader);

    const user = await getUser(authHeader);
    if (!user) {
      console.log("❌ No user found for organizer route");
      return c.json({ error: "Authentication required" }, 401);
    }
    console.log(`✅ User authenticated: ${user.id}`);

    console.log("🏢 Checking if user is an organizer...");
    const organizer = await getOrganizer(user.id);

    if (!organizer) {
      console.log("❌ User is not an organizer");
      return c.json({ error: "User is not an organizer" }, 403);
    }

    console.log(`✅ User is organizer with ID: ${organizer.id}`);

    console.log("📊 Fetching bookings for organizer events...");
    // Get all bookings for events owned by this organizer
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        events!inner (
          id,
          title,
          start_date,
          start_time,
          location_name,
          organizer_id
        ),
        booking_items (
          quantity,
          unit_price,
          total_price,
          ticket_types (
            name,
            description
          )
        ),
        tickets (
          id,
          ticket_code,
          qr_code,
          status,
          scanned_at
        )
      `
      )
      .eq("events.organizer_id", organizer.id)
      .order("created_at", { ascending: false });

    console.log(`📈 Bookings query result:`, {
      bookingsCount: bookings?.length || 0,
      error: error ? error.message : null,
    });

    if (error) {
      console.error("❌ Error fetching organizer bookings:", error);
      return c.json({ error: "Failed to fetch bookings" }, 500);
    }

    console.log(`✅ Successfully fetched ${bookings?.length || 0} bookings`);
    return c.json({
      bookings: bookings || [],
    });
  } catch (error) {
    console.error("💥 Exception in /organizer endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get user's own bookings
app.get("/", async (c) => {
  console.log("🔥 ROOT ROUTE (/) called - User bookings endpoint");
  try {
    const user = await getUser(c.req.header("authorization"));
    if (!user) {
      console.log("❌ No user found for root route");
      return c.json({ error: "Unauthorized" }, 401);
    }
    console.log("✅ User found for root route, fetching bookings...");

    // Get all bookings for this user
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        events (
          id,
          title,
          slug,
          start_date,
          start_time,
          location_name,
          location_address
        ),
        booking_items (
          quantity,
          unit_price,
          total_price,
          ticket_types (
            name,
            description
          )
        ),
        tickets (
          id,
          ticket_code,
          qr_code,
          status,
          scanned_at
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user bookings:", error);
      return c.json({ error: "Failed to fetch bookings" }, 500);
    }

    return c.json({
      bookings: bookings || [],
    });
  } catch (error) {
    console.error("Error in / endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get specific booking details
app.get("/:id", async (c) => {
  const bookingId = c.req.param("id");
  console.log(`🔥 ID ROUTE (/:id) called with ID: ${bookingId}`);
  try {
    const user = await getUser(c.req.header("authorization"));
    if (!user) {
      console.log("❌ No user found for ID route");
      return c.json({ error: "Unauthorized" }, 401);
    }
    console.log(`✅ User found for ID route, fetching booking ${bookingId}...`);

    // Get booking with all related data
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        events (
          id,
          title,
          slug,
          start_date,
          start_time,
          end_date,
          end_time,
          location_name,
          location_address,
          description,
          organizers (
            business_name,
            contact_email
          )
        ),
        booking_items (
          quantity,
          unit_price,
          total_price,
          ticket_types (
            id,
            name,
            description
          )
        ),
        tickets (
          id,
          ticket_code,
          qr_code,
          status,
          scanned_at,
          created_at
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (error) {
      console.error("Error fetching booking:", error);
      return c.json({ error: "Booking not found" }, 404);
    }

    // Check if user owns this booking or is the organizer
    let hasAccess = booking.user_id === user.id;

    if (!hasAccess) {
      const organizer = await getOrganizer(user.id);
      if (organizer) {
        hasAccess = booking.events.organizer_id === organizer.id;
      }
    }

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    return c.json({
      booking,
    });
  } catch (error) {
    console.error("Error in /:id endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create new booking (public endpoint - authentication optional)
app.post("/", async (c) => {
  try {
    const user = await getUser(c.req.header("authorization"));
    // Note: User authentication is optional for booking creation

    const { event_id, items, customer_name, customer_email, customer_phone } =
      await c.req.json();

    // Validate required fields
    if (!event_id || !items || !customer_name || !customer_email) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Validate ticket availability
    for (const item of items) {
      const { data: available } = await supabase.rpc(
        "check_ticket_availability",
        {
          ticket_type_id: item.ticket_type_id,
          requested_quantity: item.quantity,
        }
      );

      if (!available) {
        return c.json(
          {
            error: `Not enough tickets available for ticket type ${item.ticket_type_id}`,
          },
          400
        );
      }
    }

    // Calculate total price
    let totalPrice = 0;
    const bookingItems = [];

    for (const item of items) {
      const { data: ticketType } = await supabase
        .from("ticket_types")
        .select("price")
        .eq("id", item.ticket_type_id)
        .single();

      if (ticketType) {
        const itemTotal = ticketType.price * item.quantity;
        totalPrice += itemTotal;

        bookingItems.push({
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
          unit_price: ticketType.price,
          total_price: itemTotal,
        });
      }
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user?.id || null, // Allow null for anonymous bookings
        event_id,
        customer_name,
        customer_email,
        customer_phone,
        total_price: totalPrice,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return c.json({ error: "Failed to create booking" }, 500);
    }

    // Create booking items
    for (const item of bookingItems) {
      const { error: itemError } = await supabase.from("booking_items").insert({
        booking_id: booking.id,
        ...item,
      });

      if (itemError) {
        console.error("Error creating booking item:", itemError);
        // Clean up booking if item creation fails
        await supabase.from("bookings").delete().eq("id", booking.id);
        return c.json({ error: "Failed to create booking items" }, 500);
      }
    }

    return c.json({
      booking,
      checkout_url: null, // Would be populated if using Stripe checkout
    });
  } catch (error) {
    console.error("Error in POST / endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update booking status
app.put("/:id/status", async (c) => {
  try {
    const user = await getUser(c.req.header("authorization"));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const bookingId = c.req.param("id");
    const { status } = await c.req.json();

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    // Check if user has permission to update this booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("user_id, events(organizer_id)")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    let hasAccess = booking.user_id === user.id;

    if (!hasAccess) {
      const organizer = await getOrganizer(user.id);
      if (organizer) {
        hasAccess = booking.events.organizer_id === organizer.id;
      }
    }

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Update booking status
    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      console.error("Error updating booking status:", error);
      return c.json({ error: "Failed to update booking status" }, 500);
    }

    return c.json({
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error in PUT /:id/status endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Cancel booking
app.delete("/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("authorization"));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const bookingId = c.req.param("id");

    // Check if user owns this booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("user_id, status")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    if (booking.user_id !== user.id) {
      return c.json({ error: "Access denied" }, 403);
    }

    if (booking.status === "cancelled") {
      return c.json({ error: "Booking already cancelled" }, 400);
    }

    // Update booking status to cancelled
    const { data: cancelledBooking, error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      console.error("Error cancelling booking:", error);
      return c.json({ error: "Failed to cancel booking" }, 500);
    }

    return c.json({
      booking: cancelledBooking,
    });
  } catch (error) {
    console.error("Error in DELETE /:id endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
