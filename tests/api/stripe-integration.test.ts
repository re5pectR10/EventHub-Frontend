// Integration tests for Stripe API routes
// Tests the payment processing endpoints with proper mocking

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock environment variables
vi.mock("process", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_mock_stripe_key",
    STRIPE_WEBHOOK_SECRET: "whsec_mock_webhook_secret",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_mock_publishable_key",
  },
}));

// Mock Stripe SDK
const mockStripe = {
  accounts: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

vi.mock("stripe", () => {
  return {
    default: vi.fn(() => mockStripe),
  };
});

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase-server", () => ({
  createClient: () => mockSupabaseClient,
}));

describe("Stripe API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/connect/create", () => {
    it("should create a Stripe Connect account successfully", async () => {
      const mockAccount = {
        id: "acct_test123",
        type: "express",
        country: "US",
        email: "organizer@example.com",
      };

      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockSupabaseClient
        .from()
        .update()
        .eq()
        .mockResolvedValue({
          data: { stripe_account_id: "acct_test123" },
          error: null,
        });

      // Dynamic import to test the handler
      const { POST } = await import("@/app/api/stripe/connect/create/route");

      const requestBody = {
        organizerId: "org123",
        email: "organizer@example.com",
        country: "US",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/create",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.accountId).toBe("acct_test123");
      expect(mockStripe.accounts.create).toHaveBeenCalledWith({
        type: "express",
        country: "US",
        email: "organizer@example.com",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    });

    it("should handle missing organizer ID", async () => {
      const { POST } = await import("@/app/api/stripe/connect/create/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/create",
        {
          method: "POST",
          body: JSON.stringify({ email: "test@example.com" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain("organizerId");
    });
  });

  describe("POST /api/stripe/checkout/create", () => {
    it("should create a checkout session with platform fees", async () => {
      const mockSession = {
        id: "cs_test123",
        url: "https://checkout.stripe.com/session123",
      };

      const mockEvent = {
        id: "event123",
        title: "Test Event",
        organizer: { stripe_account_id: "acct_test123" },
      };

      const mockTickets = [
        { id: "ticket1", name: "General", price: 5000, quantity: 2 },
      ];

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockEvent,
        error: null,
      });
      mockSupabaseClient.from().select().eq.mockResolvedValue({
        data: mockTickets,
        error: null,
      });

      const { POST } = await import("@/app/api/stripe/checkout/create/route");

      const requestBody = {
        eventId: "event123",
        tickets: [{ ticketId: "ticket1", quantity: 2 }],
        customerEmail: "customer@example.com",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/checkout/create",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe("cs_test123");
      expect(result.data.url).toBe("https://checkout.stripe.com/session123");
    });

    it("should calculate correct platform fees", async () => {
      const mockSession = { id: "cs_test123", url: "https://example.com" };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      // Mock event and tickets
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: "event123",
            title: "Test Event",
            organizer: { stripe_account_id: "acct_test123" },
          },
          error: null,
        });

      mockSupabaseClient
        .from()
        .select()
        .eq.mockResolvedValue({
          data: [{ id: "ticket1", name: "VIP", price: 10000, quantity: 1 }],
          error: null,
        });

      const { POST } = await import("@/app/api/stripe/checkout/create/route");

      const requestBody = {
        eventId: "event123",
        tickets: [{ ticketId: "ticket1", quantity: 1 }],
        customerEmail: "customer@example.com",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/checkout/create",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);

      // Verify platform fee calculation (5% of total)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 500, // 5% of 10000
          }),
        }),
        expect.objectContaining({
          stripeAccount: "acct_test123",
        })
      );
    });
  });

  describe("POST /api/stripe/webhook", () => {
    it("should process checkout.session.completed event", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test123",
            metadata: {
              eventId: "event123",
              bookingData: JSON.stringify([
                { ticketId: "ticket1", quantity: 2, attendees: [] },
              ]),
            },
            customer_details: {
              email: "customer@example.com",
            },
            amount_total: 10000,
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockSupabaseClient.rpc.mockResolvedValue({ data: "BKG123", error: null });

      const { POST } = await import("@/app/api/stripe/webhook/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "mock-webhook-body",
          headers: {
            "stripe-signature": "mock-signature",
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        "mock-webhook-body",
        "mock-signature",
        "whsec_mock_webhook_secret"
      );
    });

    it("should handle invalid webhook signatures", async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const { POST } = await import("@/app/api/stripe/webhook/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "mock-webhook-body",
          headers: {
            "stripe-signature": "invalid-signature",
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/stripe/connect/status", () => {
    it("should return account status successfully", async () => {
      const mockAccount = {
        id: "acct_test123",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const { GET } = await import("@/app/api/stripe/connect/status/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/status?accountId=acct_test123"
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.charges_enabled).toBe(true);
      expect(result.data.payouts_enabled).toBe(true);
    });

    it("should handle missing account ID parameter", async () => {
      const { GET } = await import("@/app/api/stripe/connect/status/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/status"
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain("accountId");
    });
  });
});
