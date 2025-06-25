# Optimized Authentication System

This directory contains the optimized authentication system that minimizes `supabase.auth.getUser()` calls and provides global state management.

## Architecture

### 1. Global State Management (`auth-store.ts`)

- Uses Zustand for client-side auth state management
- Calls `supabase.auth.getUser()` only once on app initialization
- Listens to auth state changes via `onAuthStateChange`
- Provides actions for sign out, refresh, etc.

### 2. Server-Side Optimization (`auth-helper.ts`)

- Caches auth results for 30 seconds to avoid repeated API calls
- Used by middleware for efficient server-side auth checks
- Automatically cleans up old cache entries

### 3. Middleware Optimization (`middleware.ts`)

- Only runs on protected routes (dashboard, my-bookings, become-organizer, checkout)
- Uses cached auth helper to minimize database calls
- Only creates full Supabase client when cookie updates are needed

### 4. Provider System (`AuthProvider`)

- Initializes auth state once when the app starts
- Wraps the entire application to provide global auth context

## Usage

### Basic Auth Checks

```tsx
import { useAuth } from "@/lib/auth";

function MyComponent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return <div>Hello, {user.email}!</div>;
}
```

### Auth Actions

```tsx
import { useAuthActions } from "@/lib/auth";

function SignOutButton() {
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
    // User state will be automatically updated
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

### Lightweight Auth Check (No Additional API Calls)

```tsx
import { useAuthCheck } from "@/lib/auth";

function Header() {
  const { user, isAuthenticated, isLoading } = useAuthCheck();

  // This won't trigger additional API calls if auth is already initialized
  return (
    <header>
      {isAuthenticated ? (
        <span>Welcome, {user.email}</span>
      ) : (
        <a href="/auth/signin">Sign In</a>
      )}
    </header>
  );
}
```

### Server-Side Auth (in Server Components or API Routes)

```tsx
import { getServerUser } from "@/lib/auth";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getServerUser(request);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ... rest of your logic
}
```

## Benefits

1. **Reduced API Calls**: `supabase.auth.getUser()` is called only once on app initialization instead of on every route change
2. **Server-Side Caching**: 30-second cache on server reduces database load
3. **Optimized Middleware**: Only runs on protected routes, not all routes
4. **Global State**: Consistent auth state across the entire application
5. **Better Performance**: Fewer network requests and faster route transitions

## Migration Guide

### Before (Multiple API Calls)

```tsx
// This would call supabase.auth.getUser() on every component mount
function Component() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
}
```

### After (Global State)

```tsx
// This uses the cached global state, no additional API calls
function Component() {
  const { user } = useAuth();
  // user is instantly available from global state
}
```

## Configuration

The auth system is automatically configured when you wrap your app with the providers in `app/providers.tsx`:

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <Header />
    {children}
  </AuthProvider>
</QueryClientProvider>
```

The middleware is configured to only run on protected routes in `middleware.ts`:

- `/dashboard/*`
- `/my-bookings/*`
- `/become-organizer`
- `/checkout/*`

This ensures optimal performance by avoiding unnecessary auth checks on public pages.
