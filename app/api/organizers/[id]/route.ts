import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../../lib/supabase-server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Get organizer by ID (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Organizer ID is required" },
        { status: 400 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();
    const { data: organizer, error } = await supabaseServer
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
        verification_status,
        created_at,
        updated_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organizer not found" },
          { status: 404 }
        );
      }
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Failed to fetch organizer: ${error.message}` },
        { status: 500 }
      );
    }

    // Add events count for this organizer
    const { count, error: countError } = await supabaseServer
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", organizer.id)
      .eq("status", "published");

    const organizerWithCount = {
      ...organizer,
      name: organizer.business_name,
      events_count: countError ? 0 : count || 0,
    };

    return NextResponse.json({ data: organizerWithCount });
  } catch (error) {
    console.error("Organizer fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizer" },
      { status: 500 }
    );
  }
}
