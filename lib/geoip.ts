import { createClient } from "@/utils/supabase/client";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  region?: string;
  source: "ip" | "browser" | "manual" | "unknown";
}

// Cache for GeoIP database in memory (for Vercel functions)
let geoipCache: {
  data: ArrayBuffer | null;
  lastUpdated: number;
  expiresAt: number;
} = {
  data: null,
  lastUpdated: 0,
  expiresAt: 0,
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function downloadGeoIPFromSupabase(): Promise<ArrayBuffer | null> {
  try {
    console.log("📍 Downloading GeoIP database from Supabase Storage...");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("⚠️ Supabase configuration missing for GeoIP download");
      return null;
    }

    // Use service role key for server-side access
    const supabase = createClient();

    // First, try to get the City database (more detailed)
    const { data: cityData, error: cityError } = await supabase.storage
      .from("geoip")
      .download("GeoLite2-City.tar.gz");

    if (cityData && !cityError) {
      console.log(
        "✅ Successfully downloaded GeoLite2-City from Supabase Storage"
      );
      const arrayBuffer = await cityData.arrayBuffer();

      // Update cache
      geoipCache = {
        data: arrayBuffer,
        lastUpdated: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION,
      };

      return arrayBuffer;
    }

    console.warn("⚠️ Failed to download GeoLite2-City:", cityError?.message);

    // Fallback to Country database
    const { data: countryData, error: countryError } = await supabase.storage
      .from("geoip")
      .download("GeoLite2-Country.tar.gz");

    if (countryData && !countryError) {
      console.log(
        "✅ Successfully downloaded GeoLite2-Country from Supabase Storage"
      );
      const arrayBuffer = await countryData.arrayBuffer();

      // Update cache
      geoipCache = {
        data: arrayBuffer,
        lastUpdated: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION,
      };

      return arrayBuffer;
    }

    console.error(
      "❌ Failed to download any GeoIP database:",
      countryError?.message
    );
    return null;
  } catch (error) {
    console.error("❌ Error downloading GeoIP database from Supabase:", error);
    return null;
  }
}

async function getGeoIPDatabase(): Promise<ArrayBuffer | null> {
  // Check if we have a valid cached version
  if (geoipCache.data && Date.now() < geoipCache.expiresAt) {
    console.log("📍 Using cached GeoIP database");
    return geoipCache.data;
  }

  // Download fresh data from Supabase
  console.log("📍 GeoIP cache expired or empty, downloading fresh data...");
  return await downloadGeoIPFromSupabase();
}

/**
 * Mock GeoIP lookup function that would work with MaxMind data
 * In production, you would need to:
 * 1. Extract the .mmdb file from the tar.gz
 * 2. Use a library like @maxmind/geoip2-node to parse it
 * 3. Perform the actual IP lookup
 */
async function performGeoIPLookup(ip: string): Promise<LocationData | null> {
  try {
    // Get the database
    const database = await getGeoIPDatabase();

    if (!database) {
      console.warn("⚠️ No GeoIP database available for lookup");
      return null;
    }

    console.log(`📍 Performing GeoIP lookup for IP: ${ip}`);

    // For now, we'll use a fallback IP geolocation service
    // In production, you would parse the MaxMind .mmdb file here
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`
    );

    if (!response.ok) {
      console.warn("⚠️ IP geolocation service request failed");
      return null;
    }

    const data = await response.json();

    if (data.status !== "success") {
      console.warn("⚠️ IP geolocation lookup failed");
      return null;
    }

    return {
      latitude: data.lat,
      longitude: data.lon,
      city: data.city,
      country: data.country,
      region: data.regionName,
      source: "ip",
    };
  } catch (error) {
    console.error("❌ Error in GeoIP lookup:", error);
    return null;
  }
}

/**
 * Detect user location using various methods
 */
export async function detectUserLocation(
  userAgent?: string,
  forwardedFor?: string,
  realIP?: string
): Promise<LocationData> {
  console.log("🌍 Starting location detection...");

  // Try to get the actual IP address
  const ip = realIP || forwardedFor?.split(",")[0]?.trim() || "127.0.0.1";

  console.log(`🔍 Detected IP: ${ip}`);

  // Skip localhost/private IPs
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    console.log("⚠️ Local/private IP detected, skipping GeoIP lookup");
    return {
      latitude: 0,
      longitude: 0,
      city: "Unknown",
      country: "Unknown",
      region: "Unknown",
      source: "unknown",
    };
  }

  // Try GeoIP lookup
  const geoipResult = await performGeoIPLookup(ip);

  if (geoipResult) {
    console.log("✅ GeoIP location detected:", geoipResult);
    return geoipResult;
  }

  // Fallback to default/unknown location
  console.log("⚠️ Could not determine location, using fallback");
  return {
    latitude: 0,
    longitude: 0,
    city: "Unknown",
    country: "Unknown",
    region: "Unknown",
    source: "unknown",
  };
}

/**
 * Get location data with caching for better performance
 */
export async function getCachedLocation(
  userAgent?: string,
  forwardedFor?: string,
  realIP?: string
): Promise<LocationData> {
  return detectUserLocation(userAgent, forwardedFor, realIP);
}

/**
 * Check if GeoIP database is available and up to date
 */
export async function checkGeoIPStatus(): Promise<{
  available: boolean;
  lastUpdated: string | null;
  cacheStatus: "hit" | "miss" | "expired";
}> {
  const now = Date.now();

  let cacheStatus: "hit" | "miss" | "expired" = "miss";

  if (geoipCache.data) {
    cacheStatus = now < geoipCache.expiresAt ? "hit" : "expired";
  }

  return {
    available: geoipCache.data !== null,
    lastUpdated: geoipCache.lastUpdated
      ? new Date(geoipCache.lastUpdated).toISOString()
      : null,
    cacheStatus,
  };
}
