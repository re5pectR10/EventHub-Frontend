import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-server";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseServer = await getServerSupabaseClient();
    const { data: categories, error } = await supabaseServer
      .from("event_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch categories: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { categories: categories || [] },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
