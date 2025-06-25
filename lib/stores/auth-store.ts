import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  serverChecked: boolean; // Track if server already verified auth
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setServerChecked: (checked: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

// Check if we're on a protected route (middleware would have run)
const isProtectedRoute = () => {
  if (typeof window === "undefined") return false;

  const protectedPaths = [
    "/dashboard",
    "/my-bookings",
    "/become-organizer",
    "/checkout",
  ];
  const currentPath = window.location.pathname;

  return protectedPaths.some((path) => currentPath.startsWith(path));
};

// Check if server already verified auth by looking for auth cookies
const hasAuthCookies = () => {
  if (typeof document === "undefined") return false;

  // Check for Supabase auth cookies
  const cookies = document.cookie;
  return (
    cookies.includes("supabase-auth-token") ||
    cookies.includes("sb-") ||
    cookies.includes("auth-token")
  );
};

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isLoading: true,
    isInitialized: false,
    error: null,
    serverChecked: false,

    // Actions
    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setServerChecked: (serverChecked) => set({ serverChecked }),

    initialize: async () => {
      const { isInitialized } = get();

      // Only initialize once
      if (isInitialized) {
        return;
      }

      try {
        set({ isLoading: true, error: null });

        const supabase = createClient();

        // If we're on a protected route and have auth cookies,
        // the server middleware already verified auth
        const isProtected = isProtectedRoute();
        const hasAuth = hasAuthCookies();

        if (isProtected && hasAuth) {
          console.log(
            "🔄 Server already checked auth, syncing client state..."
          );
          set({ serverChecked: true });
        }

        // Get initial user (this will still be needed for auth state listener setup)
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Auth initialization error:", error);
          set({
            error: error.message,
            user: null,
            isLoading: false,
            isInitialized: true,
          });
          return;
        }

        console.log(
          "✅ Auth initialized with user:",
          user?.id ? `User ID: ${user.id}` : "No user"
        );
        set({ user, isLoading: false, isInitialized: true });

        // Set up auth state listener (this is essential for auth changes)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          console.log(
            "🔔 Auth state changed:",
            event,
            session?.user?.id ? `User ID: ${session.user.id}` : "No user"
          );

          const newUser = session?.user ?? null;
          set({ user: newUser, isLoading: false });

          // Handle sign out
          if (event === "SIGNED_OUT") {
            set({ user: null });
          }
        });

        // Store subscription for cleanup (if needed in the future)
        // This could be stored in a ref or another way if cleanup is required
      } catch (err) {
        console.error("Auth initialization failed:", err);
        set({
          error: err instanceof Error ? err.message : "Unknown error",
          user: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    },

    signOut: async () => {
      try {
        set({ isLoading: true, error: null });

        const supabase = createClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        set({ user: null, isLoading: false });
      } catch (err) {
        console.error("Sign out error:", err);
        set({
          error: err instanceof Error ? err.message : "Sign out failed",
          isLoading: false,
        });
      }
    },

    refresh: async () => {
      try {
        set({ isLoading: true, error: null });

        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          set({ error: error.message, user: null, isLoading: false });
          return;
        }

        set({ user, isLoading: false });
      } catch (err) {
        console.error("Auth refresh error:", err);
        set({
          error: err instanceof Error ? err.message : "Refresh failed",
          isLoading: false,
        });
      }
    },
  }))
);

// Helper selectors for common use cases
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const error = useAuthStore((state) => state.error);
  const serverChecked = useAuthStore((state) => state.serverChecked);

  return { user, isLoading, isInitialized, error, serverChecked };
};

export const useAuthActions = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const signOut = useAuthStore((state) => state.signOut);
  const refresh = useAuthStore((state) => state.refresh);
  const setServerChecked = useAuthStore((state) => state.setServerChecked);

  return { initialize, signOut, refresh, setServerChecked };
};
