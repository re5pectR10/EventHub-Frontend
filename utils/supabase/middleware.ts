import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getServerUser } from "./auth-helper";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Only create full Supabase client if we need to set cookies
  // For simple auth checks, use the cached helper
  const user = await getServerUser(request);

  // If we have a user, we still need to refresh the session cookies
  if (user) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh the session to update cookies
    await supabase.auth.getUser();
  }

  const authRoute = "/auth";
  // Define public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/events",
    "/categories",
    "/organizers",
    authRoute,
  ];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) => {
    if (route === "/") {
      return request.nextUrl.pathname === "/";
    }
    return request.nextUrl.pathname.startsWith(route);
  });

  // Check for dynamic routes like /events/[slug] and /organizers/[id]
  const isDynamicEventRoute = /^\/events\/[^\/]+$/.test(
    request.nextUrl.pathname
  );
  const isDynamicOrganizerRoute = /^\/organizers\/[^\/]+$/.test(
    request.nextUrl.pathname
  );

  if (
    !user &&
    !isPublicRoute &&
    !isDynamicEventRoute &&
    !isDynamicOrganizerRoute
  ) {
    // no user, potentially respond by redirecting the user to the auth page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith(authRoute);
  const isDynamicAuthRoute = /^\/auth\/[^\/]+$/.test(request.nextUrl.pathname);
  console.log(isAuthRoute, isDynamicAuthRoute, user);
  if (user && (isAuthRoute || isDynamicAuthRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse;
}
