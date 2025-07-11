import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Basic admin check - you should implement proper admin authentication
    const authHeader = request.headers.get("authorization");
    const adminKey = process.env.ADMIN_API_KEY; // Set this in your environment

    if (!adminKey || !authHeader?.includes(adminKey)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    // Call the update-geoip-database function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-geoip-database`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "force_update",
          timestamp: new Date().toISOString(),
          force_update: true,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "GeoIP update failed", details: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "GeoIP database force update initiated",
      result,
    });
  } catch (error) {
    console.error("Force update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
