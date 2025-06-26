import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client with service role key (bypasses RLS)
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase server environment variables:", {
      url: !!supabaseUrl,
      serviceKey: !!supabaseServiceKey,
    });
    throw new Error(
      "Missing Supabase server environment variables. Please check SUPABASE_SERVICE_ROLE_KEY is set."
    );
  }

  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
    },
  });
}

// Client-side client with user context (respects RLS)
export function createUserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase client environment variables");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
    },
  });
}
