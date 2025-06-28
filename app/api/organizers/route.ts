import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../lib/supabase-server";

// GET /api/organizers - Get all organizers (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;
    const supabaseServer = await getServerSupabaseClient();

    let query = supabaseServer
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
      `,
        { count: "exact" }
      )
      .eq("verification_status", "verified")
      .order("business_name", { ascending: true });

    // Apply search filter if provided
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: organizers, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch organizers: ${error.message}` },
        { status: 500 }
      );
    }

    // Add events count for each organizer
    const organizersWithEventCount = await Promise.all(
      (organizers || []).map(async (organizer) => {
        const { count: eventsCount } = await supabaseServer
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "published");

        return {
          ...organizer,
          name: organizer.business_name, // Alias for consistency
          events_count: eventsCount || 0,
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: organizersWithEventCount,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Organizers fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}
