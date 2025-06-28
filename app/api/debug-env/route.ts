import { NextResponse } from "next/server";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check environment variables (without exposing the actual values)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!supabaseUrl,
        length: supabaseUrl?.length || 0,
        starts_with: supabaseUrl?.substring(0, 8) || "N/A",
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!supabaseAnonKey,
        length: supabaseAnonKey?.length || 0,
        starts_with: supabaseAnonKey?.substring(0, 8) || "N/A",
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!supabaseServiceKey,
        length: supabaseServiceKey?.length || 0,
        starts_with: supabaseServiceKey?.substring(0, 8) || "N/A",
      },
      environment: process.env.NODE_ENV || "unknown",
      vercel_env: process.env.VERCEL_ENV || "unknown",
    };

    return NextResponse.json(
      {
        message: "Environment variables check",
        env_check: envCheck,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Debug env error:", error);
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
