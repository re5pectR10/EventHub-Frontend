import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/events/featured - Get featured events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    const supabaseServer = await getServerSupabaseClient();
    const { data: events, error } = await supabaseServer
      .from("events")
      .select(
        `
        *,
        organizers(business_name, contact_email),
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
      )
      .eq("status", "published")
      .eq("featured", true)
      .order("start_date", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch featured events: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error("Featured events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured events" },
      { status: 500 }
    );
  }
}
