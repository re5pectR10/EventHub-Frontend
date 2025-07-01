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
    .select("*")
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

// GET /api/stripe/connect/status - Get Stripe Connect account status
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

    // Check if user is an organizer
    const organizer = await getOrganizer(user.id);
    if (!organizer) {
      return NextResponse.json(
        { error: "User is not an organizer" },
        { status: 403 }
      );
    }

    if (!organizer.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        message: "No Stripe account connected",
      });
    }

    // Get Stripe account details
    const account = await stripe.accounts.retrieve(organizer.stripe_account_id);

    const status = {
      connected: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      verification_status:
        account.charges_enabled && account.payouts_enabled
          ? "verified"
          : "pending",
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || [],
        pending_verification: account.requirements?.pending_verification || [],
      },
      business_profile: {
        name: account.business_profile?.name,
        url: account.business_profile?.url,
        support_email: account.business_profile?.support_email,
      },
    };

    // Update verification status in database if it changed
    const newVerificationStatus = status.verification_status;
    if (organizer.verification_status !== newVerificationStatus) {
      const supabaseServer = await getServerSupabaseClient();
      await supabaseServer
        .from("organizers")
        .update({
          verification_status: newVerificationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizer.id);
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      { error: "Failed to get Stripe Connect status" },
      { status: 500 }
    );
  }
}
