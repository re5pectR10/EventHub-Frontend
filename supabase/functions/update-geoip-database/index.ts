import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Environment variables for MaxMind API
const MAXMIND_LICENSE_KEY = Deno.env.get("MAXMIND_LICENSE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// MaxMind GeoLite2 download URLs
const GEOLITE2_CITY_URL = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz`;
const GEOLITE2_COUNTRY_URL = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz`;

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private logs: LogEntry[] = [];

  info(message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      metadata,
    };
    this.logs.push(entry);
    console.log(`[INFO] ${message}`, metadata || "");
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      metadata,
    };
    this.logs.push(entry);
    console.warn(`[WARN] ${message}`, metadata || "");
  }

  error(message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      metadata,
    };
    this.logs.push(entry);
    console.error(`[ERROR] ${message}`, metadata || "");
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }
}

async function downloadAndExtractGeoIP(
  url: string,
  filename: string,
  logger: Logger
): Promise<Uint8Array | null> {
  try {
    logger.info(`Starting download of ${filename}`, { url });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GeoIP-Update-Service/1.0",
      },
    });

    if (!response.ok) {
      logger.error(`Failed to download ${filename}`, {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const contentLength = response.headers.get("content-length");
    logger.info(`Download started for ${filename}`, {
      contentLength: contentLength ? parseInt(contentLength) : "unknown",
    });

    // Get the response as array buffer
    const tarGzBuffer = await response.arrayBuffer();
    logger.info(`Download completed for ${filename}`, {
      size: tarGzBuffer.byteLength,
    });

    // For now, we'll store the compressed tar.gz file directly
    // In a production setup, you might want to extract and process the .mmdb file
    return new Uint8Array(tarGzBuffer);
  } catch (error) {
    logger.error(`Error downloading ${filename}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function uploadToSupabaseStorage(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  file: Uint8Array,
  logger: Logger
): Promise<boolean> {
  try {
    logger.info(`Uploading to Supabase Storage`, { bucket, path });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true, // Overwrite existing file
        contentType: "application/gzip",
      });

    if (error) {
      logger.error("Upload to Supabase Storage failed", {
        error: error.message,
        bucket,
        path,
      });
      return false;
    }

    logger.info("Upload to Supabase Storage successful", {
      bucket,
      path,
      data,
    });
    return true;
  } catch (error) {
    logger.error("Error uploading to Supabase Storage", {
      error: error instanceof Error ? error.message : String(error),
      bucket,
      path,
    });
    return false;
  }
}

async function createGeoIPBucket(
  supabase: ReturnType<typeof createClient>,
  logger: Logger
): Promise<boolean> {
  try {
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      logger.error("Failed to list buckets", { error: listError.message });
      return false;
    }

    const bucketExists = buckets.some((bucket: any) => bucket.name === "geoip");

    if (!bucketExists) {
      logger.info("Creating geoip bucket");
      const { data, error } = await supabase.storage.createBucket("geoip", {
        public: false,
        allowedMimeTypes: ["application/gzip", "application/octet-stream"],
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
      });

      if (error) {
        logger.error("Failed to create geoip bucket", { error: error.message });
        return false;
      }

      logger.info("GeoIP bucket created successfully", { data });
    } else {
      logger.info("GeoIP bucket already exists");
    }

    return true;
  } catch (error) {
    logger.error("Error managing GeoIP bucket", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function updateGeoIPDatabase(logger: Logger): Promise<{
  success: boolean;
  message: string;
  logs: LogEntry[];
}> {
  // Validate environment variables
  if (!MAXMIND_LICENSE_KEY) {
    logger.error("MAXMIND_LICENSE_KEY environment variable is required");
    return {
      success: false,
      message: "Missing MaxMind license key",
      logs: logger.getLogs(),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logger.error("Supabase configuration is missing");
    return {
      success: false,
      message: "Missing Supabase configuration",
      logs: logger.getLogs(),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  logger.info("Starting GeoIP database update process");

  // Create bucket if it doesn't exist
  const bucketReady = await createGeoIPBucket(supabase, logger);
  if (!bucketReady) {
    return {
      success: false,
      message: "Failed to prepare storage bucket",
      logs: logger.getLogs(),
    };
  }

  // Download and upload City database
  const cityData = await downloadAndExtractGeoIP(
    GEOLITE2_CITY_URL,
    "GeoLite2-City",
    logger
  );

  if (!cityData) {
    return {
      success: false,
      message: "Failed to download GeoLite2-City database",
      logs: logger.getLogs(),
    };
  }

  const cityUploadSuccess = await uploadToSupabaseStorage(
    supabase,
    "geoip",
    "GeoLite2-City.tar.gz",
    cityData,
    logger
  );

  // Download and upload Country database
  const countryData = await downloadAndExtractGeoIP(
    GEOLITE2_COUNTRY_URL,
    "GeoLite2-Country",
    logger
  );

  if (!countryData) {
    return {
      success: false,
      message: "Failed to download GeoLite2-Country database",
      logs: logger.getLogs(),
    };
  }

  const countryUploadSuccess = await uploadToSupabaseStorage(
    supabase,
    "geoip",
    "GeoLite2-Country.tar.gz",
    countryData,
    logger
  );

  // Store metadata about the update
  const updateMetadata = {
    timestamp: new Date().toISOString(),
    city_database_size: cityData.length,
    country_database_size: countryData.length,
    success: cityUploadSuccess && countryUploadSuccess,
  };

  try {
    await supabase.storage
      .from("geoip")
      .upload("metadata.json", JSON.stringify(updateMetadata, null, 2), {
        cacheControl: "300",
        upsert: true,
        contentType: "application/json",
      });
  } catch (error) {
    logger.warn("Failed to upload metadata", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const success = cityUploadSuccess && countryUploadSuccess;
  logger.info("GeoIP database update process completed", {
    success,
    cityUploadSuccess,
    countryUploadSuccess,
  });

  return {
    success,
    message: success
      ? "GeoIP databases updated successfully"
      : "GeoIP database update failed",
    logs: logger.getLogs(),
  };
}

Deno.serve(async (req: Request) => {
  const logger = new Logger();

  try {
    // Enhanced security: Verify token is valid service role key or anon key
    const authHeader = req.headers.get("authorization");
    const expectedServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("Missing or invalid authorization header format");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const isValidServiceRole = token === expectedServiceRoleKey;
    const isValidAnonKey = token === expectedAnonKey;

    if (!isValidServiceRole && !isValidAnonKey) {
      logger.warn("Invalid authentication token", {
        tokenPrefix: token.substring(0, 10) + "...",
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log the source of the request for auditing
    const requestBody = await req.json().catch(() => ({}));
    const source = requestBody.source || "unknown";
    logger.info("Authorized GeoIP update request", {
      source,
      tokenType: isValidServiceRole ? "service_role" : "anon",
    });

    const result = await updateGeoIPDatabase(logger);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    logger.error("Unhandled error in GeoIP update function", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
        logs: logger.getLogs(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
