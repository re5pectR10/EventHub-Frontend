"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/utils/supabase/client";

/**
 * Hook to synchronize server-side auth state with client-side store
 * This is useful when SSR provides initial auth state that should be synced
 */
export function useAuthSync(initialUser?: any) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    // If we have initial user data from SSR, sync it immediately
    if (initialUser && !isInitialized) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser, isInitialized, setUser, setLoading]);
}

/**
 * Lightweight auth check that uses cached state
 * This won't trigger additional API calls if auth is already initialized
 */
export function useAuthCheck() {
  const { user, isLoading, isInitialized } = useAuthStore((state) => ({
    user: state.user,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
  }));

  // Only initialize if not already done
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize();
    }
  }, [isInitialized, isLoading, initialize]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isInitialized,
  };
}
