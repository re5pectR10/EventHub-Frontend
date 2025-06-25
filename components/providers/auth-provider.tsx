"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { logEnvironmentInfo } from "@/lib/utils";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initializingRef = useRef(false);

  useEffect(() => {
    // Log environment info for debugging
    logEnvironmentInfo();

    // Prevent multiple initialization calls (handles React strict mode)
    if (!isInitialized && !initializingRef.current) {
      initializingRef.current = true;
      console.log("🚀 Auth Provider: Initializing auth store...");

      initialize().finally(() => {
        initializingRef.current = false;
      });
    }
  }, [initialize, isInitialized]);

  return <>{children}</>;
}
