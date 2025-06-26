# Testing Guide for Local Events Hub

## Overview

This project uses **Vitest** as the primary testing framework, chosen for its excellent TypeScript support, fast execution, and seamless integration with Next.js 14. Our testing strategy covers:

1. **Unit Tests** - Individual functions and utilities
2. **Integration Tests** - API routes and database operations
3. **Component Tests** - React components with React Testing Library
4. **E2E Tests** - Complete user workflows (future)

## Setup Instructions

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

The following testing dependencies have been added to `package.json`:

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/ui": "^1.1.3",
    "@vitest/coverage-v8": "^1.1.3",
    "jsdom": "^23.2.0",
    "msw": "^2.0.11",
    "next-test-api-route-handler": "^4.0.8",
    "vitest": "^1.1.3"
  }
}
```

### 2. Configuration Files

#### `vitest.config.ts`

- Configures Vitest with React plugin
- Sets up jsdom environment for React components
- Defines test file patterns and coverage settings
- Configures path aliases to match Next.js setup

#### `tests/setup.ts`

- Global test setup and mocks
- Mocks Next.js router and headers
- Mocks Supabase client for consistent testing
- Sets up environment variables for tests

### 3. Test Scripts

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run all tests from root
npm run test
```

## Testing Structure

```
apps/web/tests/
├── setup.ts                 # Global test configuration
├── mocks/
│   └── server.ts            # MSW server for API mocking
├── api/                     # API route tests
│   ├── categories.test.ts   # Categories API tests
│   ├── events.test.ts       # Events API tests
│   ├── bookings.test.ts     # Bookings API tests
│   ├── stripe.test.ts       # Stripe integration tests
│   └── webhooks.test.ts     # Webhook processing tests
├── components/              # React component tests
│   ├── ui/                  # UI component tests
│   ├── events/              # Event-related component tests
│   └── auth/                # Authentication component tests
├── utils/                   # Utility function tests
│   ├── validation.test.ts   # Input validation tests
│   ├── auth.test.ts         # Authentication utilities
│   └── helpers.test.ts      # General helper functions
└── integration/             # Integration tests
    ├── booking-flow.test.ts # Complete booking workflow
    └── auth-flow.test.ts    # Authentication workflow
```

## Testing Patterns

### 1. API Route Testing

Using `next-test-api-route-handler` for testing Next.js API routes:

```typescript
import { testApiHandler } from "next-test-api-route-handler";
import handler from "@/app/api/categories/route";

it("should return categories", async () => {
  await testApiHandler({
    appHandler: handler,
    test: async ({ fetch }) => {
      const response = await fetch({ method: "GET" });
      expect(response.status).toBe(200);
    },
  });
});
```

### 2. Component Testing

Using React Testing Library for component testing:

```typescript
import { render, screen } from "@testing-library/react";
import { EventCard } from "@/components/events/event-card";

it("should display event information", () => {
  render(<EventCard event={mockEvent} />);
  expect(screen.getByText("Sample Event")).toBeInTheDocument();
});
```

### 3. Mocking Strategies

#### Supabase Mocking

```typescript
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    // ... other methods
  })),
};

vi.mock("@/lib/supabase-server", () => ({
  createClient: () => mockSupabaseClient,
}));
```

#### Stripe Mocking

```typescript
const mockStripe = {
  checkout: { sessions: { create: vi.fn() } },
  accounts: { create: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
};

vi.mock("stripe", () => ({ default: vi.fn(() => mockStripe) }));
```

### 4. Authentication Testing

Testing protected routes and authentication flows:

```typescript
const mockUser = {
  id: "user_123",
  email: "test@example.com",
  role: "organizer",
};

// Mock authenticated user
mockSupabaseClient.auth.getUser.mockResolvedValue({
  data: { user: mockUser },
  error: null,
});
```

## Test Categories

### Unit Tests

- **Input validation** (email, phone, dates)
- **Business logic** (price calculations, booking references)
- **Utility functions** (formatting, sanitization)
- **Data transformations** (API response formatting)

### Integration Tests

- **API endpoints** with real database operations
- **Authentication flows** (login, signup, password reset)
- **Payment processing** (Stripe integration)
- **Email sending** (confirmation emails)

### Component Tests

- **UI components** (buttons, forms, cards)
- **Event components** (event cards, booking forms)
- **Layout components** (header, footer, navigation)
- **Auth components** (login forms, user menus)

### End-to-End Tests (Future)

- **Complete booking workflow** (search → book → pay → confirm)
- **Event creation workflow** (create → publish → manage)
- **User registration workflow** (signup → verify → complete profile)

## Best Practices

### 1. Test Organization

- Group related tests with `describe` blocks
- Use descriptive test names with `it('should...')`
- Keep tests focused on single behaviors
- Use setup/teardown for consistent test states

### 2. Mocking Guidelines

- Mock external dependencies (APIs, databases)
- Mock at the boundary (not internal functions)
- Use realistic mock data
- Reset mocks between tests

### 3. Assertions

- Test behavior, not implementation
- Use specific assertions (`toBe`, `toEqual`, `toContain`)
- Test both success and error cases
- Verify side effects (database calls, API calls)

### 4. Test Data

- Use factories for consistent test data
- Keep test data minimal but realistic
- Use constants for repeated values
- Clean up test data after tests

## Coverage Goals

- **Unit Tests**: 90%+ coverage for utilities and business logic
- **Integration Tests**: 80%+ coverage for API routes
- **Component Tests**: 70%+ coverage for UI components
- **Critical Paths**: 100% coverage for payment and booking flows

## Running Tests in CI/CD

The testing setup integrates with the existing Turbo monorepo configuration:

```json
// turbo.json
{
  "tasks": {
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Debugging Tests

### Using VS Code

1. Install the "Vitest" extension
2. Set breakpoints in test files
3. Run tests in debug mode

### Using Browser DevTools

```bash
npm run test:ui
```

Opens the Vitest UI in your browser for interactive debugging.

### Verbose Output

```bash
npm run test -- --reporter=verbose
```

## Common Issues and Solutions

### 1. Next.js Headers Mock Issues

Fixed in `tests/setup.ts` with proper `next/headers` mocking.

### 2. Supabase SSR Issues

Mocked both client and server-side Supabase clients.

### 3. Environment Variables

Set in `tests/setup.ts` to ensure consistent test environment.

### 4. API Route Handler Types

Use `next-test-api-route-handler` for proper typing and testing.

## Next Steps

1. **Install Dependencies**: Run `npm install` in `apps/web`
2. **Run First Tests**: `npm run test:run`
3. **Add Component Tests**: Start with simple UI components
4. **Expand API Tests**: Add tests for all migrated endpoints
5. **Integration Tests**: Test complete workflows
6. **E2E Setup**: Consider Playwright for end-to-end testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)
- [MSW Documentation](https://mswjs.io/)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
