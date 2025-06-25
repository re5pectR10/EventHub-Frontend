import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

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
  ],
};
