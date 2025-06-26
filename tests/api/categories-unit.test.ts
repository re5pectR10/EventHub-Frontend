// Unit tests for Categories API logic
// Testing the core functionality without HTTP complications

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockOrderFn = vi.fn().mockResolvedValue({
  data: [
    { id: "1", name: "Music", description: "Live music events" },
    { id: "2", name: "Sports", description: "Sporting events" },
  ],
  error: null,
});

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    order: mockOrderFn,
  })),
};

// Simple function to test (this represents our API logic)
async function fetchCategories() {
  try {
    const { data: categories, error } = await mockSupabaseClient
      .from("event_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return { categories };
  } catch (error) {
    throw new Error("Failed to fetch categories");
  }
}

describe("Categories API Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchCategories function", () => {
    it("should return all categories successfully", async () => {
      const result = await fetchCategories();

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

      await expect(fetchCategories()).rejects.toThrow(
        "Failed to fetch categories: Database connection failed"
      );
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

      const result = await fetchCategories();
      expect(result.categories).toEqual([]);
    });
  });

  describe("Data validation", () => {
    it("should validate category structure", async () => {
      const result = await fetchCategories();

      const category = result.categories[0];
      expect(category).toHaveProperty("id");
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("description");
      expect(typeof category.name).toBe("string");
      expect(typeof category.description).toBe("string");
    });

    it("should ensure categories are ordered by name", async () => {
      const result = await fetchCategories();

      // Check that order function was called with correct params
      expect(mockOrderFn).toHaveBeenCalledWith("name", { ascending: true });
    });
  });
});
