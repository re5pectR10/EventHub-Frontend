import { createServerClient } from "@supabase/ssr";
import { type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

// Simple in-memory cache for user info (for the current request lifecycle)
const userCache = new Map<string, { user: User | null; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function getServerUser(
  request: NextRequest
): Promise<User | null> {
  // Create a cache key based on cookies (since user session is stored in cookies)
  const cookieString = request.cookies.toString();
  const cacheKey = cookieString;

  // Check cache first
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("🚀 Server auth: Using cached user data");
    return cached.user;
  }

  console.log("🔍 Server auth: Cache miss, fetching user from Supabase...");

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // We don't need to set cookies in this helper
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Server auth error:", error);
    } else {
      console.log(
        "✅ Server auth: Retrieved user",
        user?.id ? `User ID: ${user.id}` : "No user"
      );
    }

    // Cache the result
    userCache.set(cacheKey, {
      user: user || null,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (basic cleanup)
    if (userCache.size > 100) {
      const now = Date.now();
      const entries = Array.from(userCache.entries());
      for (const [key, value] of entries) {
        if (now - value.timestamp > CACHE_DURATION) {
          userCache.delete(key);
        }
      }
    }

    return user || null;
  } catch (error) {
    console.error("Error getting server user:", error);
    return null;
  }
}
