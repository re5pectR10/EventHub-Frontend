// Integration test for Categories API routes
// Tests the actual HTTP endpoint using the correct structure

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/categories/route";

// Mock the supabase server import - using the exact path from the route
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        { id: "1", name: "Music", description: "Live music events" },
        { id: "2", name: "Sports", description: "Sporting events" },
      ],
      error: null,
    }),
  })),
};

vi.mock("../../../lib/supabase-server", () => ({
  supabaseServer: mockSupabaseClient,
}));

describe("Categories API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("should return all categories successfully", async () => {
      const request = new NextRequest("http://localhost:3000/api/categories");

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.categories).toBeDefined();
      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0]).toHaveProperty("name", "Music");
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("event_categories");
    });

    it("should handle database errors gracefully", async () => {
      // Mock database error
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/categories");
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain("Failed to fetch categories");
    });

    it("should return proper JSON structure", async () => {
      const request = new NextRequest("http://localhost:3000/api/categories");
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty("categories");
      expect(result.categories[0]).toHaveProperty("id");
      expect(result.categories[0]).toHaveProperty("name");
      expect(result.categories[0]).toHaveProperty("description");
    });

    it("should handle empty results", async () => {
      // Mock empty result
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/categories");
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.categories).toEqual([]);
    });
  });
});
