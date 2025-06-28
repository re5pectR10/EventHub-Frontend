import { NextResponse } from "next/server";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      message: "Simple test endpoint works",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
