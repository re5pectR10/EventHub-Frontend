// Unit tests for validation utilities

import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePhone,
  validateEventDate,
  sanitizeInput,
  calculateTotalPrice,
  generateBookingReference,
  validateTicketQuantity,
} from "@/lib/utils/validation";

describe("Validation Utils", () => {
  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.email+tag@domain.co.uk")).toBe(true);
      expect(validateEmail("user123@test-domain.org")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
      expect(validateEmail("user..double.dot@domain.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validatePhone", () => {
    it("should validate correct phone numbers", () => {
      expect(validatePhone("+1234567890")).toBe(true);
      expect(validatePhone("123-456-7890")).toBe(true);
      expect(validatePhone("(123) 456-7890")).toBe(true);
      expect(validatePhone("123 456 7890")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(validatePhone("123")).toBe(false);
      expect(validatePhone("abc-def-ghij")).toBe(false);
      expect(validatePhone("")).toBe(false);
    });
  });

  describe("validateEventDate", () => {
    it("should validate future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(validateEventDate(futureDate.toISOString())).toBe(true);
    });

    it("should reject past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      expect(validateEventDate(pastDate.toISOString())).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    it("should remove HTML tags", () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        'alert("xss")'
      );
      expect(sanitizeInput("Hello <strong>World</strong>")).toBe("Hello World");
    });

    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello world  ")).toBe("hello world");
    });

    it("should handle empty strings", () => {
      expect(sanitizeInput("")).toBe("");
    });
  });
});

// Business logic tests
describe("Booking Logic", () => {
  describe("calculateTotalPrice", () => {
    it("should calculate total price for multiple tickets", () => {
      const tickets = [
        { quantity: 2, price: 50 },
        { quantity: 1, price: 100 },
      ];

      const total = calculateTotalPrice(tickets);
      expect(total).toBe(200); // (2 * 50) + (1 * 100)
    });
  });

  describe("generateBookingReference", () => {
    it("should generate unique booking references", () => {
      const ref1 = generateBookingReference();
      const ref2 = generateBookingReference();

      expect(ref1).toMatch(/^BKG-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(ref2).toMatch(/^BKG-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });
  });

  describe("validateTicketQuantity", () => {
    it("should validate ticket quantities within limits", () => {
      expect(validateTicketQuantity(1)).toBe(true);
      expect(validateTicketQuantity(5)).toBe(true);
      expect(validateTicketQuantity(10)).toBe(true);
      expect(validateTicketQuantity(0)).toBe(false);
      expect(validateTicketQuantity(11)).toBe(false);
      expect(validateTicketQuantity(-1)).toBe(false);
    });
  });
});
