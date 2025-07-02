import { createUserSupabaseClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Valid email verification types for Supabase auth.verifyOtp when using token_hash
type EmailOtpType =
  | "email"
  | "recovery"
  | "invite"
  | "email_change"
  | "signup"
  | "magiclink";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createUserSupabaseClient();

    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // redirect the user to an error page with some instructions
  return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
}
