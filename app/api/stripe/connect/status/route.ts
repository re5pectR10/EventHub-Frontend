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

// GET /api/stripe/connect/status - Get Stripe Connect account status
export async function GET(request: NextRequest) {
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
    if (!organizer || !organizer.stripe_account_id) {
      return NextResponse.json({
        data: {
          account_id: null,
          verification_status: "not_connected",
          charges_enabled: false,
          payouts_enabled: false,
        },
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(organizer.stripe_account_id);

    const verificationStatus =
      account.charges_enabled && account.payouts_enabled
        ? "verified"
        : account.requirements?.currently_due &&
          account.requirements.currently_due.length > 0
        ? "pending"
        : "rejected";

    // Update verification status in database if changed
    if (organizer.verification_status !== verificationStatus) {
      await supabaseServer
        .from("organizers")
        .update({
          verification_status: verificationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizer.id);
    }

    return NextResponse.json({
      data: {
        account_id: organizer.stripe_account_id,
        verification_status: verificationStatus,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
      },
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get Stripe Connect status",
      },
      { status: 500 }
    );
  }
}
