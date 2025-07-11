// Cron job configuration for GeoIP database updates
// This runs every Sunday at 2:00 AM UTC (weekly)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export const cronSchedule = "0 2 * * 0"; // Sunday at 2:00 AM UTC

interface CronJobResult {
  success: boolean;
  message: string;
  timestamp: string;
  nextRun?: string;
}

export async function executeCronJob(): Promise<CronJobResult> {
  const timestamp = new Date().toISOString();

  try {
    console.log(
      `[${timestamp}] Starting weekly GeoIP database update cron job`
    );

    // Get function URL from environment
    const functionUrl = `${Deno.env.get(
      "SUPABASE_URL"
    )}/functions/v1/update-geoip-database`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!functionUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration for cron job");
    }

    // Trigger the update function
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "cron",
        timestamp,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `GeoIP update failed: ${result.message || "Unknown error"}`
      );
    }

    console.log(`[${timestamp}] GeoIP database update completed successfully`);

    // Calculate next run time (next Sunday at 2:00 AM UTC)
    const nextRun = new Date();
    nextRun.setUTCDate(nextRun.getUTCDate() + (7 - nextRun.getUTCDay()));
    nextRun.setUTCHours(2, 0, 0, 0);

    return {
      success: true,
      message: "GeoIP database updated successfully via cron",
      timestamp,
      nextRun: nextRun.toISOString(),
    };
  } catch (error) {
    console.error(`[${timestamp}] Cron job failed:`, error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown cron job error",
      timestamp,
    };
  }
}
