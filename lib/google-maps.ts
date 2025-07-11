import { getGoogleMapsApi as getGoogleMapsApiHelper } from "./types/google-maps";

let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: {
      maps?: any;
    };
    initGoogleMaps?: () => void;
  }
}

/**
 * Dynamically loads the Google Maps JavaScript API
 * @returns Promise that resolves when the API is loaded
 */
export function loadGoogleMapsApi(): Promise<void> {
  if (isGoogleMapsLoaded) {
    return Promise.resolve();
  }

  if (isGoogleMapsLoading && loadPromise) {
    return loadPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured"));
  }

  isGoogleMapsLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== "undefined" && window.google && window.google.maps) {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    // Global callback function
    window.initGoogleMaps = () => {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      resolve();
      // Clean up the global callback
      delete window.initGoogleMaps;
    };

    script.onerror = () => {
      isGoogleMapsLoading = false;
      loadPromise = null;
      reject(new Error("Failed to load Google Maps API"));
    };

    // Append script to document
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Checks if Google Maps API is available
 * @returns boolean indicating if the API is loaded
 */
export function isGoogleMapsApiLoaded(): boolean {
  return (
    isGoogleMapsLoaded &&
    typeof window !== "undefined" &&
    window.google &&
    window.google.maps
  );
}

/**
 * Gets the Google Maps API object safely
 * @returns Google Maps API object or null if not loaded
 */
export function getGoogleMapsApi() {
  return getGoogleMapsApiHelper();
}
