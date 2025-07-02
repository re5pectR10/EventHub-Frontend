// Integration tests for Stripe API routes
// Tests the payment processing endpoints with proper mocking

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Stripe SDK
const mockStripe = {
  accounts: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  accountLinks: {
    create: vi.fn(),
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

// Create simple mocks for the data we need
let mockUserFromToken: unknown = null;
let mockOrganizerData: unknown = null;
let mockEventData: unknown = null;
let mockTicketData: unknown = null;
let mockUpdateResult: unknown = null;
let mockInsertResult: unknown = null;
let mockRpcResult: unknown = null;

// Mock supabase-server with proper function exports
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "organizers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockOrganizerData),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockUpdateResult),
          }),
        };
      }
      if (table === "events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockEventData),
            }),
          }),
        };
      }
      if (table === "ticket_types") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockTicketData),
            }),
          }),
        };
      }
      if (table === "bookings") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockInsertResult),
            }),
          }),
        };
      }
      if (table === "booking_items") {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      }
      if (table === "tickets") {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      }
      // Default fallback for other tables
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc: vi.fn().mockImplementation(() => mockRpcResult),
  })),
  getUserSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
  getUserFromToken: vi.fn().mockImplementation(() => mockUserFromToken),
  isValidUUID: vi.fn().mockReturnValue(true),
  createServerClient: vi.fn(),
  createUserClient: vi.fn(),
}));

describe("Stripe API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables to test defaults
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
    process.env.NEXT_PUBLIC_DOMAIN = "http://localhost:3000";

    // Reset mock data
    mockUserFromToken = null;
    mockOrganizerData = null;
    mockEventData = null;
    mockTicketData = null;
    mockUpdateResult = null;
    mockInsertResult = null;
    mockRpcResult = null;
  });

  describe("POST /api/stripe/connect/create", () => {
    it("should create a Stripe Connect account successfully", async () => {
      const mockUser = { id: "user123", email: "organizer@example.com" };
      const mockOrganizer = {
        id: "org123",
        user_id: "user123",
        name: "Test Organizer",
        contact_email: "organizer@example.com",
        stripe_account_id: null,
      };
      const mockAccount = {
        id: "acct_test123",
        type: "express",
        country: "US",
        email: "organizer@example.com",
      };
      const mockAccountLink = {
        url: "https://connect.stripe.com/setup/123",
      };

      // Set up mock data
      mockUserFromToken = mockUser;
      mockOrganizerData = { data: mockOrganizer, error: null };
      mockUpdateResult = {
        data: { stripe_account_id: "acct_test123" },
        error: null,
      };

      // Mock Stripe calls
      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink);

      // Dynamic import to test the handler
      const { POST } = await import("@/app/api/stripe/connect/create/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: "Bearer mock-token",
          },
        }
      );

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.account_id).toBe("acct_test123");
      expect(result.data.account_link_url).toBe(
        "https://connect.stripe.com/setup/123"
      );
    });

    it("should handle unauthenticated requests", async () => {
      // Leave mockUserFromToken as null (unauthenticated)

      const { POST } = await import("@/app/api/stripe/connect/create/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toContain("Authentication required");
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
        status: "published",
        organizers: {
          id: "org123",
          stripe_account_id: "acct_test123",
          verification_status: "verified",
        },
      };

      const mockTickets = [
        {
          id: "ticket1",
          name: "General",
          price: 5000,
          quantity_available: 100,
          quantity_sold: 0,
          max_per_order: null,
          event_id: "event123",
        },
      ];

      // Set up mock data
      mockEventData = { data: mockEvent, error: null };
      mockTicketData = { data: mockTickets, error: null };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/stripe/checkout/create/route");

      const requestBody = {
        event_id: "event123",
        tickets: [{ ticket_type_id: "ticket1", quantity: 2 }],
        customer_email: "customer@example.com",
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

      // Set up mock data for fee calculation test
      mockEventData = {
        data: {
          id: "event123",
          title: "Test Event",
          status: "published",
          organizers: {
            id: "org123",
            stripe_account_id: "acct_test123",
            verification_status: "verified",
          },
        },
        error: null,
      };
      mockTicketData = {
        data: [
          {
            id: "ticket1",
            name: "VIP",
            price: 10000,
            quantity_available: 100,
            quantity_sold: 0,
            max_per_order: null,
            event_id: "event123",
          },
        ],
        error: null,
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const { POST } = await import("@/app/api/stripe/checkout/create/route");

      const requestBody = {
        event_id: "event123",
        tickets: [{ ticket_type_id: "ticket1", quantity: 1 }],
        customer_email: "customer@example.com",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/checkout/create",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      await POST(request);

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
              event_id: "event123",
              tickets: JSON.stringify([
                { ticket_type_id: "ticket1", quantity: 2 },
              ]),
            },
            customer_details: {
              email: "customer@example.com",
              name: "John Doe",
            },
            amount_total: 10000,
            payment_intent: "pi_test123",
          },
        },
      };

      // Set up mock data for webhook processing
      mockInsertResult = { data: { id: "booking123" }, error: null };
      mockRpcResult = { data: null, error: null };
      mockTicketData = { data: { id: "ticket1", price: 5000 }, error: null };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

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
        "whsec_mock"
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
      const mockUser = { id: "user123" };
      const mockOrganizer = {
        id: "org123",
        user_id: "user123",
        stripe_account_id: "acct_test123",
        verification_status: "pending",
      };
      const mockAccount = {
        id: "acct_test123",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };

      // Set up mock data
      mockUserFromToken = mockUser;
      mockOrganizerData = { data: mockOrganizer, error: null };
      mockUpdateResult = {
        data: { verification_status: "verified" },
        error: null,
      };

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const { GET } = await import("@/app/api/stripe/connect/status/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/status?accountId=acct_test123",
        {
          headers: {
            authorization: "Bearer mock-token",
          },
        }
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.charges_enabled).toBe(true);
      expect(result.data.payouts_enabled).toBe(true);
    });

    it("should handle missing account ID parameter", async () => {
      // Leave mockUserFromToken as null (unauthenticated)

      const { GET } = await import("@/app/api/stripe/connect/status/route");

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/connect/status"
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toContain("Authentication required");
    });
  });
});
