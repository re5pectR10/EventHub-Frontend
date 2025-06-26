import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { data: organizers, error } = await supabaseServer
      .from("organizers")
      .select(
        `
        id,
        business_name,
        description,
        contact_email,
        website,
        logo_url,
        location,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Failed to fetch organizers: ${error.message}` },
        { status: 500 }
      );
    }

    // Add events count for each organizer
    const organizersWithCount = await Promise.all(
      (organizers || []).map(async (organizer: any) => {
        const { count, error: countError } = await supabaseServer
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "published");

        return {
          ...organizer,
          name: organizer.business_name,
          events_count: countError ? 0 : count || 0,
        };
      })
    );

    return NextResponse.json({ data: organizersWithCount });
  } catch (error) {
    console.error("Organizers fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}
