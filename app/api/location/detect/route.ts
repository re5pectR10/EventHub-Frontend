import { NextRequest, NextResponse } from "next/server";
import { detectUserLocation, checkGeoIPStatus } from "@/lib/geoip";

export async function GET(request: NextRequest) {
  try {
    console.log("🌍 Location detection API called");

    // Extract location data from Vercel headers (priority 1)
    const vercelCountry = request.headers.get("x-vercel-ip-country");
    const vercelRegion = request.headers.get("x-vercel-ip-country-region");
    const vercelCity = request.headers.get("x-vercel-ip-city");
    const vercelLatitude = request.headers.get("x-vercel-ip-latitude");
    const vercelLongitude = request.headers.get("x-vercel-ip-longitude");

    // If we have Vercel geolocation data, use it (most accurate)
    if (vercelLatitude && vercelLongitude) {
      console.log("✅ Using Vercel geolocation headers");

      const locationData = {
        latitude: parseFloat(vercelLatitude),
        longitude: parseFloat(vercelLongitude),
        city: vercelCity || undefined,
        country: vercelCountry || undefined,
        region: vercelRegion || undefined,
        source: "vercel",
      };

      return NextResponse.json(locationData);
    }

    // Fallback to GeoIP lookup using Supabase-stored database (priority 2)
    console.log("⚠️ Vercel headers not available, trying GeoIP lookup");

    // Extract IP from headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const locationData = await detectUserLocation(
      userAgent || undefined,
      forwardedFor || undefined,
      realIP || undefined
    );

    console.log("📍 Location detection result:", locationData);

    return NextResponse.json(locationData);
  } catch (error) {
    console.error("❌ Location detection error:", error);

    // Return a safe fallback location
    return NextResponse.json({
      latitude: 0,
      longitude: 0,
      city: "Unknown",
      country: "Unknown",
      region: "Unknown",
      source: "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Health check endpoint for GeoIP status
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "status") {
      const status = await checkGeoIPStatus();

      return NextResponse.json({
        geoip: status,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("❌ GeoIP status check error:", error);

    return NextResponse.json(
      {
        error: "Status check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
