import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, supabaseServer } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(
      request.headers.get("authorization") || undefined
    );

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        error: "No authentication token found",
      });
    }

    // Check for organizer record
    const { data: organizer, error: organizerError } = await supabaseServer
      .from("organizers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get all organizers for comparison
    const { data: allOrganizers, error: allOrganizersError } =
      await supabaseServer.from("organizers").select("*");

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      organizer: organizer || null,
      organizerError: organizerError?.message || null,
      allOrganizers: allOrganizers || [],
      debug: {
        authHeader: request.headers.get("authorization")
          ? "present"
          : "missing",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Debug auth error:", error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
