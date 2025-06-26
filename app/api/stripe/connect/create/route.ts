import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  getUserFromToken,
} from "../../../../../lib/supabase-server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Helper function to get organizer
async function getOrganizer(userId: string) {
  try {
    const { data: organizer, error } = await supabaseServer
      .from("organizers")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching organizer:", error);
      return null;
    }

    return organizer;
  } catch (error) {
    console.error("Error in getOrganizer:", error);
    return null;
  }
}

// POST /api/stripe/connect/create - Create Stripe Connect account and onboarding link
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(
      request.headers.get("authorization") || undefined
    );
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const organizer = await getOrganizer(user.id);
    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer profile required" },
        { status: 403 }
      );
    }

    let stripeAccountId = organizer.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // You might want to make this configurable
        email: organizer.contact_email || user.email || "",
        business_profile: {
          name: organizer.business_name || organizer.name || "",
          url: organizer.website || undefined,
        },
      });

      stripeAccountId = account.id;

      // Update organizer with Stripe account ID
      const { error: updateError } = await supabaseServer
        .from("organizers")
        .update({
          stripe_account_id: stripeAccountId,
          verification_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizer.id);

      if (updateError) {
        console.error(
          "Failed to update organizer with Stripe account:",
          updateError
        );
        return NextResponse.json(
          { error: "Failed to save Stripe account information" },
          { status: 500 }
        );
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/profile?stripe_refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/profile?stripe_success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      data: {
        account_link_url: accountLink.url,
        account_id: stripeAccountId,
      },
    });
  } catch (error) {
    console.error("Stripe Connect creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Stripe Connect account",
      },
      { status: 500 }
    );
  }
}
