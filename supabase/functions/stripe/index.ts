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

// Environment variables validation
const requiredEnvVars = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: Deno.env.get("STRIPE_SECRET_KEY"),
  FRONTEND_URL: Deno.env.get("FRONTEND_URL"),
};

// Validate required environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Initialize Supabase client
const supabaseUrl = requiredEnvVars.SUPABASE_URL!;
const supabaseServiceKey = requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Stripe configuration
const stripeSecretKey = requiredEnvVars.STRIPE_SECRET_KEY!;
const frontendUrl = requiredEnvVars.FRONTEND_URL!;

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

// Helper function to get organizer
async function getOrganizer(userId: string) {
  try {
    const { data: organizer, error } = await supabase
      .from("organizers")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching organizer:", error);
      return null;
    }

    return organizer;
  } catch (error) {
    console.error("Error in getOrganizer:", error);
    return null;
  }
}

// Helper function to make Stripe API calls
async function stripeRequest(endpoint: string, options: RequestInit = {}) {
  const url = `https://api.stripe.com/v1${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Stripe API error (${response.status}):`, error);
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return response.json();
  } catch (error) {
    console.error("Stripe request failed:", error);
    throw error;
  }
}

// Create Stripe Connect account and onboarding link
app.post("/stripe/connect/create", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const organizer = await getOrganizer(user.id);
    if (!organizer) {
      return c.json({ error: "Organizer profile required" }, 403);
    }

    let stripeAccountId = organizer.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!stripeAccountId) {
      const accountData = new URLSearchParams({
        type: "express",
        country: "US", // You might want to make this configurable
        email: organizer.contact_email || user.email || "",
        "business_profile[name]":
          organizer.business_name || organizer.name || "",
        "business_profile[url]": organizer.website || "",
      });

      const account = await stripeRequest("/accounts", {
        method: "POST",
        body: accountData,
      });

      stripeAccountId = account.id;

      // Update organizer with Stripe account ID
      const { error: updateError } = await supabase
        .from("organizers")
        .update({
          stripe_account_id: stripeAccountId,
          verification_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizer.id);

      if (updateError) {
        console.error(
          "Failed to update organizer with Stripe account:",
          updateError
        );
        return c.json(
          { error: "Failed to save Stripe account information" },
          500
        );
      }
    }

    // Create account link for onboarding
    const linkData = new URLSearchParams({
      account: stripeAccountId,
      refresh_url: `${frontendUrl}/dashboard/profile?stripe_refresh=true`,
      return_url: `${frontendUrl}/dashboard/profile?stripe_success=true`,
      type: "account_onboarding",
    });

    const accountLink = await stripeRequest("/account_links", {
      method: "POST",
      body: linkData,
    });

    return c.json({
      data: {
        account_link_url: accountLink.url,
        account_id: stripeAccountId,
      },
    });
  } catch (error) {
    console.error("Stripe Connect creation error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Stripe Connect account",
      },
      500
    );
  }
});

// Get Stripe Connect account status
app.get("/stripe/connect/status", async (c: HonoContext) => {
  try {
    const user = await getUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const organizer = await getOrganizer(user.id);
    if (!organizer || !organizer.stripe_account_id) {
      return c.json({
        data: {
          account_id: null,
          verification_status: "not_connected",
          charges_enabled: false,
          payouts_enabled: false,
        },
      });
    }

    // Get account details from Stripe
    const account = await stripeRequest(
      `/accounts/${organizer.stripe_account_id}`
    );

    const verificationStatus =
      account.charges_enabled && account.payouts_enabled
        ? "verified"
        : account.requirements?.currently_due?.length > 0
        ? "pending"
        : "rejected";

    // Update verification status in database if changed
    if (organizer.verification_status !== verificationStatus) {
      await supabase
        .from("organizers")
        .update({
          verification_status: verificationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizer.id);
    }

    return c.json({
      data: {
        account_id: organizer.stripe_account_id,
        verification_status: verificationStatus,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
      },
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get Stripe Connect status",
      },
      500
    );
  }
});

// Create Stripe Checkout session for ticket purchase
app.post("/stripe/checkout/create", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const { event_id, tickets, customer_email } = body;

    // Validate input
    if (
      !event_id ||
      !tickets ||
      !Array.isArray(tickets) ||
      tickets.length === 0
    ) {
      return c.json({ error: "Event ID and tickets are required" }, 400);
    }

    // Validate ticket format
    for (const ticket of tickets) {
      if (!ticket.ticket_type_id || !ticket.quantity || ticket.quantity <= 0) {
        return c.json(
          { error: "Invalid ticket data: missing ticket_type_id or quantity" },
          400
        );
      }
    }

    // Get event details with organizer info
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        `
        *,
        organizers!inner(
          id,
          stripe_account_id,
          verification_status
        )
      `
      )
      .eq("id", event_id)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      console.error("Event fetch error:", eventError);
      return c.json({ error: "Event not found or not published" }, 404);
    }

    if (!event.organizers?.stripe_account_id) {
      return c.json(
        { error: "Event organizer has not connected Stripe account" },
        400
      );
    }

    if (event.organizers.verification_status !== "verified") {
      return c.json(
        { error: "Event organizer's Stripe account is not verified" },
        400
      );
    }

    // Get ticket types and validate availability
    const ticketTypeIds = tickets.map((t) => t.ticket_type_id);
    const { data: ticketTypes, error: ticketError } = await supabase
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)
      .eq("event_id", event_id)
      .eq("is_active", true);

    if (ticketError || !ticketTypes) {
      console.error("Ticket types fetch error:", ticketError);
      return c.json({ error: "Failed to fetch ticket types" }, 500);
    }

    // Validate ticket availability and create line items
    const lineItems = [];
    let totalAmount = 0;

    for (const ticket of tickets) {
      const ticketType = ticketTypes.find(
        (tt: any) => tt.id === ticket.ticket_type_id
      );

      if (!ticketType) {
        return c.json(
          {
            error: `Ticket type ${ticket.ticket_type_id} not found or inactive`,
          },
          400
        );
      }

      const availableQuantity =
        ticketType.quantity_available - ticketType.quantity_sold;
      if (ticket.quantity > availableQuantity) {
        return c.json(
          {
            error: `Only ${availableQuantity} tickets available for ${ticketType.name}`,
          },
          400
        );
      }

      // Check max per order limit
      if (
        ticketType.max_per_order &&
        ticket.quantity > ticketType.max_per_order
      ) {
        return c.json(
          {
            error: `Maximum ${ticketType.max_per_order} tickets allowed per order for ${ticketType.name}`,
          },
          400
        );
      }

      const itemTotal = ticketType.price * ticket.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || `Ticket for ${event.title}`,
            metadata: {
              event_id: event.id,
              ticket_type_id: ticketType.id,
            },
          },
          unit_amount: Math.round(ticketType.price * 100), // Convert to cents
        },
        quantity: ticket.quantity,
      });
    }

    // Calculate platform fee (5%)
    const platformFeeAmount = Math.round(totalAmount * 0.05 * 100); // 5% in cents

    // Create Stripe Checkout session
    const sessionData = new URLSearchParams({
      "payment_method_types[]": "card",
      mode: "payment",
      success_url: `${frontendUrl}/checkout/${event_id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/events/${event.slug}/book`,
      "payment_intent_data[application_fee_amount]":
        platformFeeAmount.toString(),
      "payment_intent_data[transfer_data][destination]":
        event.organizers.stripe_account_id,
      "metadata[event_id]": event_id,
      "metadata[tickets]": JSON.stringify(tickets),
      "metadata[total_amount]": totalAmount.toString(),
    });

    if (customer_email) {
      sessionData.append("customer_email", customer_email);
    }

    // Add line items
    lineItems.forEach((item, index) => {
      sessionData.append(
        `line_items[${index}][price_data][currency]`,
        item.price_data.currency
      );
      sessionData.append(
        `line_items[${index}][price_data][product_data][name]`,
        item.price_data.product_data.name
      );
      sessionData.append(
        `line_items[${index}][price_data][product_data][description]`,
        item.price_data.product_data.description
      );
      sessionData.append(
        `line_items[${index}][price_data][unit_amount]`,
        item.price_data.unit_amount.toString()
      );
      sessionData.append(
        `line_items[${index}][quantity]`,
        item.quantity.toString()
      );
    });

    const session = await stripeRequest("/checkout/sessions", {
      method: "POST",
      body: sessionData,
    });

    console.log(
      `Stripe checkout session created: ${session.id} for event: ${event_id}`
    );

    return c.json({
      data: {
        checkout_url: session.url,
        session_id: session.id,
      },
    });
  } catch (error) {
    console.error("Stripe Checkout creation error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      500
    );
  }
});

// Stripe webhook handler
app.post("/stripe/webhook", async (c: HonoContext) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header("stripe-signature");

    if (!signature) {
      return c.json({ error: "Missing Stripe signature" }, 400);
    }

    // Verify webhook signature (simplified - in production, use proper verification)
    // For now, we'll process the webhook without verification for development

    const event = JSON.parse(body);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// Handle successful checkout
async function handleCheckoutCompleted(session: any) {
  try {
    const eventId = session.metadata.event_id;
    const tickets = JSON.parse(session.metadata.tickets);

    // Create booking record with proper fields
    const bookingData = {
      event_id: eventId,
      customer_email: session.customer_details?.email || session.customer_email,
      customer_name: session.customer_details?.name || "Unknown",
      total_price: session.amount_total / 100, // Convert from cents
      status: "confirmed", // Use 'status' not 'payment_status'
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error("Failed to create booking:", bookingError);
      return;
    }

    // Create booking items and update ticket quantities
    for (const ticket of tickets) {
      // Get ticket type details for the unit price
      const { data: ticketType } = await supabase
        .from("ticket_types")
        .select("price")
        .eq("id", ticket.ticket_type_id)
        .single();

      if (ticketType) {
        // Create booking item with proper pricing
        await supabase.from("booking_items").insert({
          booking_id: booking.id,
          ticket_type_id: ticket.ticket_type_id,
          quantity: ticket.quantity,
          unit_price: ticketType.price,
          total_price: ticketType.price * ticket.quantity,
        });

        // Update ticket type quantity sold
        await supabase.rpc("increment_ticket_sold", {
          ticket_type_id: ticket.ticket_type_id,
          quantity: ticket.quantity,
        });

        // Generate individual tickets
        for (let i = 0; i < ticket.quantity; i++) {
          const ticketCode = generateTicketCode();
          const qrCode = generateQRCode(ticketCode);

          await supabase.from("tickets").insert({
            booking_id: booking.id,
            ticket_type_id: ticket.ticket_type_id,
            ticket_code: ticketCode,
            qr_code: qrCode,
            status: "issued",
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    console.log(`Booking created successfully: ${booking.id}`);
  } catch (error) {
    console.error("Error handling checkout completion:", error);
  }
}

function generateTicketCode(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

function generateQRCode(ticketCode: string): string {
  // In a real implementation, you'd generate a proper QR code
  // For now, we'll just return a placeholder URL
  return `https://your-app.com/verify-ticket/${ticketCode}`;
}

// Handle Stripe account updates
async function handleAccountUpdated(account: any) {
  try {
    const verificationStatus =
      account.charges_enabled && account.payouts_enabled
        ? "verified"
        : account.requirements?.currently_due?.length > 0
        ? "pending"
        : "rejected";

    await supabase
      .from("organizers")
      .update({ verification_status: verificationStatus })
      .eq("stripe_account_id", account.id);

    console.log(
      `Account ${account.id} status updated to ${verificationStatus}`
    );
  } catch (error) {
    console.error("Error handling account update:", error);
  }
}

// Health check
app.get("/stripe/health", (c: HonoContext) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: !!requiredEnvVars.SUPABASE_URL,
      stripe_configured: !!requiredEnvVars.STRIPE_SECRET_KEY,
      frontend_url: !!requiredEnvVars.FRONTEND_URL,
    },
  });
});

export default app;
