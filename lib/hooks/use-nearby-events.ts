import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@/lib/stores/location-store";
import type { Event } from "@/lib/types";

// Types for nearby events response
interface NearbyEventsParams {
  latitude?: number;
  longitude?: number;
  radius?: number; // in meters
  limit?: number;
  page?: number;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface NearbyEventsResponse {
  events: (Event & { distance_meters: number })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  search: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

// Helper function to build query string
function buildQueryString(
  params: Record<string, string | number | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

// Fetch function for nearby events
async function fetchNearbyEvents(
  params: NearbyEventsParams
): Promise<NearbyEventsResponse> {
  const { latitude, longitude, ...otherParams } = params;

  if (!latitude || !longitude) {
    throw new Error("Location coordinates are required for nearby events");
  }

  const queryString = buildQueryString({
    latitude,
    longitude,
    ...otherParams,
  });

  console.log(
    `📍 Fetching nearby events: lat=${latitude}, lng=${longitude}, radius=${
      params.radius || 50000
    }m`
  );

  const response = await fetch(`/api/events/nearby?${queryString}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  console.log(`✅ Found ${data.events?.length || 0} nearby events`);

  return data;
}

// Hook options interface
interface UseNearbyEventsOptions {
  radius?: number; // in meters, defaults to 50km
  limit?: number;
  page?: number;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean; // allow manual control of query enabling
}

// Main hook for fetching nearby events
export function useNearbyEvents(options: UseNearbyEventsOptions = {}) {
  const { location, hasCoordinates, isInitialized } = useLocation();

  const {
    radius = 50000, // 50km default
    limit = 20,
    page = 1,
    category,
    search,
    dateFrom,
    dateTo,
    enabled = true,
  } = options;

  // Create a stable query key that includes location and all parameters
  const queryKey = [
    "nearby-events",
    {
      latitude: location?.latitude,
      longitude: location?.longitude,
      radius,
      limit,
      page,
      category,
      search,
      dateFrom,
      dateTo,
    },
  ] as const;

  return useQuery({
    queryKey,
    queryFn: () =>
      fetchNearbyEvents({
        latitude: location?.latitude,
        longitude: location?.longitude,
        radius,
        limit,
        page,
        category,
        search,
        dateFrom,
        dateTo,
      }),
    enabled: enabled && isInitialized && hasCoordinates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry on location-related errors
      if (
        error instanceof Error &&
        error.message.includes("coordinates are required")
      ) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for nearby events with specific category
export function useNearbyEventsByCategory(
  category: string,
  options: Omit<UseNearbyEventsOptions, "category"> = {}
) {
  return useNearbyEvents({
    ...options,
    category,
  });
}

// Hook for searching nearby events
export function useNearbyEventsSearch(
  searchQuery: string,
  options: Omit<UseNearbyEventsOptions, "search"> = {}
) {
  return useNearbyEvents({
    ...options,
    search: searchQuery,
  });
}

// Hook to get just the nearby events data without all the query metadata
export function useNearbyEventsData(options: UseNearbyEventsOptions = {}) {
  const query = useNearbyEvents(options);

  return {
    events: query.data?.events || [],
    pagination: query.data?.pagination,
    search: query.data?.search,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// Query key factory for external use (e.g., for invalidating queries)
export const nearbyEventsKeys = {
  all: ["nearby-events"] as const,
  lists: () => [...nearbyEventsKeys.all, "list"] as const,
  list: (params: NearbyEventsParams) =>
    [...nearbyEventsKeys.lists(), params] as const,
  location: (latitude: number, longitude: number) =>
    [...nearbyEventsKeys.all, "location", { latitude, longitude }] as const,
};
