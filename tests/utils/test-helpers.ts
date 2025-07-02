/**
 * Test utilities and helpers for consistent test setup
 */

import { vi, beforeEach, afterEach, expect } from "vitest";

// Mock function factories
export const createMockApiResponse = <T>(data: T) => ({
  success: true,
  data,
  error: null,
});

export const createMockApiError = (error: string) => ({
  success: false,
  data: null,
  error,
});

// Supabase mock helpers
export function createMockSupabaseClient(overrides: any = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      ...overrides.auth,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      ...overrides.from,
    })),
    ...overrides,
  };
}

// Stripe mock helpers
export function createMockStripe(overrides: any = {}) {
  return {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
        ...overrides?.checkout?.sessions,
      },
      ...overrides?.checkout,
    },
    accounts: {
      create: vi.fn(),
      retrieve: vi.fn(),
      ...overrides?.accounts,
    },
    webhooks: {
      constructEvent: vi.fn(),
      ...overrides?.webhooks,
    },
    ...overrides,
  };
}

// Next.js router mock
export function createMockRouter(overrides: any = {}) {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
    ...overrides,
  };
}

// Test data generators
export function generateTestId() {
  return `test-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTestEmail() {
  return `test-${generateTestId()}@example.com`;
}

export function generateTestDate(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

export function generateTestTime(hour = 19, minute = 0) {
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}:00`;
}

// Wait utilities for async tests
export function waitForNextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Environment variable helpers
export function setTestEnvVars(envVars: Record<string, string>) {
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

export function clearTestEnvVars(keys: string[]) {
  keys.forEach((key) => {
    delete process.env[key];
  });
}

// API testing helpers
export function createMockRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
}

export function createMockNextRequest(
  url: string,
  options: RequestInit = {}
): any {
  return {
    url,
    method: options.method || "GET",
    headers: new Headers(options.headers),
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(""),
    ...options,
  };
}

// Database testing helpers
export function createMockDatabaseResponse<T>(
  data: T | null,
  error: any = null
) {
  return {
    data,
    error,
  };
}

export function createMockDatabaseChain(
  finalResponse: any = { data: null, error: null }
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResponse),
  };

  // Make the chain resolve to the final response when awaited
  Object.assign(chain, Promise.resolve(finalResponse));

  return chain;
}

// Authentication testing helpers
export function createMockAuthUser(overrides: any = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockAuthSession(user: any = null) {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: user || createMockAuthUser(),
  };
}

// File and image testing helpers
export function createMockFile(
  name = "test-image.jpg",
  type = "image/jpeg",
  size = 1024
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

export function createMockImageUrl() {
  return `https://example.com/images/test-${generateTestId()}.jpg`;
}

// Error boundary testing
export function ThrowError({ error }: { error: string }) {
  throw new Error(error);
}

// Re-export common testing utilities
export { vi, beforeEach, afterEach, expect };
export * from "@testing-library/react";
