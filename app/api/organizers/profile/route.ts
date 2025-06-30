import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "../../../../lib/supabase-server";

// GET /api/organizers/profile - Get organizer profile for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    const { data: organizer, error } = await supabaseServer
      .from("organizers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No organizer profile found
        return NextResponse.json(
          { error: "Organizer profile not found" },
          { status: 404 }
        );
      }
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to fetch organizer profile: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ organizer });
  } catch (error) {
    console.error("Organizer profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizer profile" },
      { status: 500 }
    );
  }
}

// PUT /api/organizers/profile - Update organizer profile
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const profileData = await request.json();
    const supabaseServer = await getServerSupabaseClient();

    // Check if organizer profile exists
    const { data: existingOrganizer } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingOrganizer) {
      return NextResponse.json(
        { error: "Organizer profile not found" },
        { status: 404 }
      );
    }

    // Update organizer profile
    const { data: organizer, error } = await supabaseServer
      .from("organizers")
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to update organizer profile: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      organizer,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Organizer profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update organizer profile" },
      { status: 500 }
    );
  }
}

// POST /api/organizers/profile - Create organizer profile
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabaseServer = await getServerSupabaseClient();

    // Check if organizer profile already exists
    const { data: existingOrganizer } = await supabaseServer
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingOrganizer) {
      return NextResponse.json(
        { error: "Organizer profile already exists" },
        { status: 409 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.business_name || !body.contact_email) {
      return NextResponse.json(
        { error: "Business name and contact email are required" },
        { status: 400 }
      );
    }

    const organizerData = {
      business_name: body.business_name,
      description: body.description || null,
      contact_email: body.contact_email,
      website: body.website || null,
      logo_url: body.logo_url || null,
      location: body.location || null,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: organizer, error } = await supabaseServer
      .from("organizers")
      .insert(organizerData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to create organizer profile: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ organizer }, { status: 201 });
  } catch (error) {
    console.error("Organizer profile creation error:", error);
    return NextResponse.json(
      { error: "Failed to create organizer profile" },
      { status: 500 }
    );
  }
}
