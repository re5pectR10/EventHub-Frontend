import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";

// Get featured events
export async function GET(request: NextRequest) {
  try {
    const { data: events, error } = await supabaseServer
      .from("events")
      .select(
        `
        *,
        organizers(business_name),
        event_categories(name, slug),
        event_images(image_url, alt_text, is_primary),
        ticket_types(id, name, price)
      `
      )
      .eq("status", "published")
      .eq("featured", true)
      .order("start_date", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Failed to fetch featured events: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Featured events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured events" },
      { status: 500 }
    );
  }
}
