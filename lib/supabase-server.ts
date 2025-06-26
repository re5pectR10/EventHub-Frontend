// Server-side Supabase client with service role key

import {
  createServerSupabaseClient,
  createUserSupabaseClient,
} from "@/utils/supabase/server";

// This bypasses RLS and should only be used in secure server environments
export const supabaseServer = createServerSupabaseClient();

// This respects RLS and user context
export const supabaseUser = createUserSupabaseClient();

// Helper functions to create clients - these need to be called in async contexts
export const getServerSupabaseClient = () => createServerSupabaseClient();
export const getUserSupabaseClient = () => createUserSupabaseClient();

// Helper function to get user from JWT token
export async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const supabaseServer = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabaseServer.auth.getUser(token);
    return error ? null : user;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Helper function to check if a string is a valid UUID
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// For backward compatibility - but these should be replaced with the async versions
export const createServerClient = createServerSupabaseClient;
export const createUserClient = createUserSupabaseClient;
