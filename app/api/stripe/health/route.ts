import { NextResponse } from "next/server";

// GET /api/stripe/health - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
      frontend_url: !!process.env.NEXT_PUBLIC_FRONTEND_URL,
    },
  });
}
