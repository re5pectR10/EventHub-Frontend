import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Types for location functionality
interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationData {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  region?: string;
  source: "ip" | "browser" | "manual" | "unknown";
}

interface LocationState {
  location: LocationData | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  hasRequestedPermission: boolean;
  permissionDenied: boolean;
}

interface LocationActions {
  setLocation: (location: LocationData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  requestPreciseLocation: () => Promise<boolean>;
  setManualLocation: (coordinates: Coordinates, locationName?: string) => void;
  initialize: () => Promise<void>;
  reset: () => void;
}

export type LocationStore = LocationState & LocationActions;

// Helper function to get location from server headers on initial load
async function getLocationFromServer(): Promise<LocationData | null> {
  try {
    console.log("🌍 Fetching initial location from server...");

    // Make a request to a simple endpoint that returns user location from headers
    const response = await fetch("/api/location/detect", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Server location detection failed:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("✅ Server location detected:", data);

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      country: data.country,
      region: data.region,
      source: data.source || "ip",
    };
  } catch (error) {
    console.error("Error fetching server location:", error);
    return null;
  }
}

// Helper function to request precise browser location
async function getBrowserLocation(): Promise<Coordinates | null> {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported by browser");
    return null;
  }

  return new Promise((resolve) => {
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ Browser geolocation success:", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Browser geolocation failed:", error.message);
        resolve(null);
      },
      options
    );
  });
}

export const useLocationStore = create<LocationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    location: null,
    isLoading: false,
    isInitialized: false,
    error: null,
    hasRequestedPermission: false,
    permissionDenied: false,

    // Actions
    setLocation: (location) => set({ location }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    initialize: async () => {
      const { isInitialized } = get();

      // Only initialize once
      if (isInitialized) {
        return;
      }

      try {
        set({ isLoading: true, error: null });

        // Try to get location from server first (Vercel headers or GeoIP)
        const serverLocation = await getLocationFromServer();

        if (serverLocation) {
          set({
            location: serverLocation,
            isLoading: false,
            isInitialized: true,
          });
          console.log("🌍 Location initialized from server");
          return;
        }

        // If server location fails, try to get from browser (if not already denied)
        const hasPermission = await navigator.permissions?.query?.({
          name: "geolocation",
        });

        if (hasPermission?.state !== "denied") {
          const browserLocation = await getBrowserLocation();

          if (browserLocation) {
            set({
              location: {
                latitude: browserLocation.lat,
                longitude: browserLocation.lng,
                source: "browser",
              },
              isLoading: false,
              isInitialized: true,
              hasRequestedPermission: true,
            });
            console.log("🌍 Location initialized from browser");
            return;
          }
        }

        // If all else fails, set as unknown
        set({
          location: { source: "unknown" },
          isLoading: false,
          isInitialized: true,
        });
        console.log("🌍 Location initialized as unknown");
      } catch (err) {
        console.error("Location initialization failed:", err);
        set({
          error: err instanceof Error ? err.message : "Unknown error",
          location: { source: "unknown" },
          isLoading: false,
          isInitialized: true,
        });
      }
    },

    requestPreciseLocation: async () => {
      try {
        set({ isLoading: true, error: null, hasRequestedPermission: true });

        const coordinates = await getBrowserLocation();

        if (coordinates) {
          set({
            location: {
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              source: "browser",
            },
            isLoading: false,
            permissionDenied: false,
          });
          return true;
        } else {
          set({
            isLoading: false,
            permissionDenied: true,
            error: "Location access denied or unavailable",
          });
          return false;
        }
      } catch (err) {
        console.error("Precise location request failed:", err);
        set({
          error: err instanceof Error ? err.message : "Location request failed",
          isLoading: false,
          permissionDenied: true,
        });
        return false;
      }
    },

    setManualLocation: (coordinates, locationName) => {
      set({
        location: {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          city: locationName,
          source: "manual",
        },
        error: null,
      });
      console.log("🌍 Manual location set:", coordinates);
    },

    reset: () => {
      set({
        location: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        hasRequestedPermission: false,
        permissionDenied: false,
      });
    },
  }))
);

// Helper selectors for common use cases
export const useLocation = () => {
  const location = useLocationStore((state) => state.location);
  const isLoading = useLocationStore((state) => state.isLoading);
  const isInitialized = useLocationStore((state) => state.isInitialized);
  const error = useLocationStore((state) => state.error);
  const hasRequestedPermission = useLocationStore(
    (state) => state.hasRequestedPermission
  );
  const permissionDenied = useLocationStore((state) => state.permissionDenied);

  return {
    location,
    isLoading,
    isInitialized,
    error,
    hasRequestedPermission,
    permissionDenied,
    hasCoordinates: location?.latitude != null && location?.longitude != null,
  };
};

export const useLocationActions = () => {
  const initialize = useLocationStore((state) => state.initialize);
  const requestPreciseLocation = useLocationStore(
    (state) => state.requestPreciseLocation
  );
  const setManualLocation = useLocationStore(
    (state) => state.setManualLocation
  );
  const reset = useLocationStore((state) => state.reset);

  return {
    initialize,
    requestPreciseLocation,
    setManualLocation,
    reset,
  };
};
