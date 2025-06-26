import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import handler from "@/app/api/categories/route";

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

vi.mock("@/lib/supabase-server", () => ({
  createClient: () => mockSupabaseClient,
}));

describe("Categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("should return all categories successfully", async () => {
      const mockCategories = [
        {
          id: "1",
          name: "Music",
          description: "Music events",
          created_at: "2024-01-01",
        },
        {
          id: "2",
          name: "Sports",
          description: "Sports events",
          created_at: "2024-01-01",
        },
      ];

      mockSupabaseClient.from().select().mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: "GET",
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data).toEqual(mockCategories);
          expect(mockSupabaseClient.from).toHaveBeenCalledWith("categories");
        },
      });
    });

    it("should handle database errors", async () => {
      mockSupabaseClient
        .from()
        .select()
        .mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        });

      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: "GET",
          });

          expect(response.status).toBe(500);
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toBe("Database connection failed");
        },
      });
    });
  });

  describe("POST /api/categories", () => {
    it("should create a new category successfully", async () => {
      const newCategory = {
        name: "Technology",
        description: "Technology conferences and meetups",
      };

      const createdCategory = {
        id: "3",
        ...newCategory,
        created_at: "2024-01-01",
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: createdCategory,
        error: null,
      });

      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: "POST",
            body: JSON.stringify(newCategory),
            headers: {
              "Content-Type": "application/json",
            },
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data).toEqual(createdCategory);
        },
      });
    });

    it("should validate required fields", async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: "POST",
            body: JSON.stringify({}),
            headers: {
              "Content-Type": "application/json",
            },
          });

          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain("required");
        },
      });
    });

    it("should handle duplicate category names", async () => {
      const duplicateCategory = {
        name: "Music",
        description: "Another music category",
      };

      mockSupabaseClient
        .from()
        .insert()
        .single.mockResolvedValue({
          data: null,
          error: {
            message: "duplicate key value violates unique constraint",
            code: "23505",
          },
        });

      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: "POST",
            body: JSON.stringify(duplicateCategory),
            headers: {
              "Content-Type": "application/json",
            },
          });

          expect(response.status).toBe(409);
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain("already exists");
        },
      });
    });
  });
});
