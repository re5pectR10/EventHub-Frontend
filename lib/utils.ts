import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Detect if React strict mode is enabled (development only)
 * React strict mode causes useEffect to run twice in development
 */
export function detectStrictMode(): boolean {
  if (typeof window === "undefined") return false;

  // In development, React strict mode causes double mounting
  // We can detect this by checking if we're in development mode
  return process.env.NODE_ENV === "development";
}

/**
 * Log information about the current environment
 */
export function logEnvironmentInfo() {
  if (typeof window === "undefined") return;

  const isDev = process.env.NODE_ENV === "development";
  const isStrictMode = detectStrictMode();

  console.log("🔧 Environment Info:", {
    isDevelopment: isDev,
    isStrictMode,
    currentPath: window.location.pathname,
    userAgent: navigator.userAgent.includes("Chrome") ? "Chrome" : "Other",
  });
}
