import { updateSession } from "@/utils/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match only routes that require authentication:
     * - /dashboard (and all sub-routes)
     * - /my-bookings (and all sub-routes)
     * - /become-organizer
     * - /checkout (and all sub-routes)
     * Skip public routes, auth routes, and static files
     */
    "/dashboard/:path*",
    "/my-bookings/:path*",
    "/become-organizer",
    "/checkout/:path*",
    /*
     * If the user is auth, redirect him from auth routes
     */
    "/auth/:path*",
  ],
};
