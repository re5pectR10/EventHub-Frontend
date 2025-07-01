import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getServerSupabaseClient,
  getUserFromToken,
} from "@/lib/supabase-server";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Helper function to get organizer
async function getOrganizer(userId: string) {
  const supabaseServer = await getServerSupabaseClient();
  const { data: organizer, error } = await supabaseServer
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return organizer;
}

// POST /api/stripe/connect/create - Create Stripe Connect account
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/stripe/connect/create - Request received");
    console.log("Content-Type:", request.headers.get("Content-Type"));
    console.log("Request method:", request.method);

    const authHeader = request.headers.get("Authorization") || undefined;
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is an organizer
    const organizer = await getOrganizer(user.id);
    if (!organizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    // Get organizer details for business information
    const supabaseClient = await getServerSupabaseClient();
    const { data: organizerDetails, error: orgError } = await supabaseClient
      .from("organizers")
      .select("*")
      .eq("id", organizer.id)
      .single();

    if (orgError || !organizerDetails) {
      return NextResponse.json(
        { error: "Failed to get organizer details" },
        { status: 500 }
      );
    }

    // Use organizer profile data for Stripe account creation
    const business_email = organizerDetails.contact_email || user.email;
    const business_name = organizerDetails.business_name;
    const country = "US"; // Default to US, can be made configurable later

    if (!business_email || !business_name) {
      return NextResponse.json(
        {
          error:
            "Business email and name are required. Please complete your organizer profile first.",
        },
        { status: 400 }
      );
    }

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: business_email,
      business_type: "company",
      company: {
        name: business_name,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Update organizer with Stripe account ID
    const supabaseServer = await getServerSupabaseClient();
    const { error: updateError } = await supabaseServer
      .from("organizers")
      .update({
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizer.id);

    if (updateError) {
      console.error(
        "Failed to update organizer with Stripe account:",
        updateError
      );
      // Note: The Stripe account was created, but we failed to save the ID
      // This should be handled with proper error recovery in production
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard/profile?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard/profile?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      data: {
        account_id: account.id,
        account_link_url: accountLink.url,
      },
      message: "Stripe Connect account created successfully",
    });
  } catch (error) {
    console.error("Stripe Connect account creation error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}
