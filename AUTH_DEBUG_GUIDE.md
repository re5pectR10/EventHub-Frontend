# Auth Debug Guide

## Issue: Duplicate `supabase.auth.getUser()` Calls

Based on [GitHub discussions](https://github.com/orgs/supabase/discussions/29228), this is a common issue where `getUser()` is called multiple times on page refresh.

## Root Causes

1. **Server + Client Coordination**: Middleware calls `getUser()` AND client store calls `getUser()`
2. **React Strict Mode**: In development, causes useEffect to run twice
3. **Multiple Auth Providers**: Multiple components initializing auth state

## Debugging Steps

### 1. Test Current Implementation

1. Open DevTools Console
2. Navigate to `/debug-auth`
3. Open `/my-bookings` in a new tab
4. Refresh the page and watch console logs

**Look for these patterns:**

```
🔧 Environment Info: {...}
🚀 Auth Provider: Initializing auth store...
🔍 Server auth: Cache miss, fetching user from Supabase...
✅ Server auth: Retrieved user User ID: xxx
🔄 Server already checked auth, syncing client state...
✅ Auth initialized with user: User ID: xxx
```

### 2. Test with Strict Mode Disabled

1. Create `.env.local` file in `apps/web/`:

   ```
   DISABLE_STRICT_MODE=true
   ```

2. Restart dev server:

   ```bash
   cd apps/web
   npm run dev
   ```

3. Test again and see if duplicates are reduced

### 3. Verify Middleware Efficiency

- Check middleware only runs on protected routes: `/dashboard/*`, `/my-bookings/*`, `/become-organizer`, `/checkout/*`
- Public routes like `/`, `/events/*` should NOT trigger middleware

## Expected Behavior (Fixed)

**On `/my-bookings` refresh:**

1. ✅ ONE server auth call (from middleware)
2. ✅ ONE client auth call (from store initialization)
3. ✅ Auth state synchronized between server and client

**Console Output Should Show:**

```
🔧 Environment Info: { isDevelopment: true, isStrictMode: false, ... }
🚀 Auth Provider: Initializing auth store...
🔍 Server auth: Cache miss, fetching user from Supabase...  // ONCE only
✅ Server auth: Retrieved user User ID: xxx
🔄 Server already checked auth, syncing client state...
✅ Auth initialized with user: User ID: xxx
```

## Implementation Details

### Server-Side Optimizations

1. **Caching**: `auth-helper.ts` caches results for 30 seconds
2. **Route-Specific**: Middleware only runs on protected routes
3. **Logging**: Clear console messages for debugging

### Client-Side Optimizations

1. **Global State**: Single auth store with Zustand
2. **Initialization Guard**: Prevents multiple initialization calls
3. **Server Coordination**: Detects when server already verified auth
4. **Strict Mode Handling**: Uses `useRef` to prevent double effects

### Key Files

- `lib/stores/auth-store.ts` - Global auth state management
- `utils/supabase/auth-helper.ts` - Server-side auth with caching
- `components/providers/auth-provider.tsx` - Auth initialization
- `middleware.ts` - Route protection
- `debug-auth/page.tsx` - Debug interface

## Troubleshooting

### Still Seeing Duplicates?

1. **Check React DevTools**: Look for multiple `AuthProvider` mounts
2. **Verify Middleware Config**: Ensure routes are correctly targeted
3. **Cache Issues**: Clear browser cache and restart dev server
4. **Environment**: Ensure `.env.local` variables are loaded

### Production Considerations

1. **Re-enable Strict Mode**: Remove `DISABLE_STRICT_MODE=true` for production
2. **Cache Duration**: Adjust 30-second cache if needed
3. **Error Handling**: Monitor error rates in production logs
4. **Performance**: Monitor auth call frequency with APM tools

## References

- [Supabase Discussion #29228](https://github.com/orgs/supabase/discussions/29228)
- [Supabase Discussion #29437](https://github.com/orgs/supabase/discussions/29437)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
