"use client";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SuggestedEvents } from "@/components/home/suggested-events";
import { apiService } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocation } from "@/lib/stores/location-store";
import { useNearbyEvents } from "@/lib/hooks/use-nearby-events";
import type { EventSearchParams, Category, Event } from "@/lib/types";
import {
  Grid,
  List,
  Search,
  SlidersHorizontal,
  MapPin,
  Globe,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface FilterState {
  query: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  location: string;
  sort: "date_asc" | "date_desc" | "price_asc" | "price_desc" | "distance_asc";
  locationMode: "all" | "nearby";
  radius: number; // in meters
}

interface EventsClientProps {
  mode: "hybrid" | "csr";
  initialEvents?: Event[];
  initialCategories?: Category[];
  initialTotal?: number;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function EventsClient({
  mode,
  initialEvents = [],
  initialCategories = [],
  initialTotal = 0,
  searchParams,
}: EventsClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const {
    location,
    hasCoordinates,
    isInitialized: locationInitialized,
  } = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Check if this is a suggested events view
  const isSuggestedView =
    (searchParams?.suggested as string) === "true" ||
    urlSearchParams.get("suggested") === "true";

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterState>(() => ({
    query: (searchParams?.q as string) || urlSearchParams.get("q") || "",
    category:
      (searchParams?.category as string) ||
      urlSearchParams.get("category") ||
      "",
    dateFrom:
      (searchParams?.dateFrom as string) ||
      urlSearchParams.get("dateFrom") ||
      "",
    dateTo:
      (searchParams?.dateTo as string) || urlSearchParams.get("dateTo") || "",
    location:
      (searchParams?.location as string) ||
      urlSearchParams.get("location") ||
      "",
    sort:
      (searchParams?.sort as FilterState["sort"]) ||
      (urlSearchParams.get("sort") as FilterState["sort"]) ||
      "date_asc",
    locationMode:
      (searchParams?.locationMode as "all" | "nearby") ||
      (urlSearchParams.get("locationMode") as "all" | "nearby") ||
      "all",
    radius:
      parseInt(searchParams?.radius as string) ||
      parseInt(urlSearchParams.get("radius") || "50000") ||
      50000, // 50km default
  }));

  // Determine if we should use client-side fetching
  const shouldUseCsr =
    mode === "csr" ||
    Object.values(filters).some(
      (value) =>
        value !== "" &&
        value !== "date_asc" &&
        value !== "all" &&
        value !== 50000
    ) ||
    user; // Use CSR for authenticated users (personalization)

  // For hybrid mode with no filters and no user, use initial SSG/ISR data
  const useInitialData = mode === "hybrid" && !shouldUseCsr;

  // Determine if we should use nearby events
  const shouldUseNearbyEvents =
    filters.locationMode === "nearby" && hasCoordinates;

  // Fetch categories using React Query (always needed for filters)
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await apiService.getCategories();
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: useInitialData ? { categories: initialCategories } : undefined,
  });

  const categories =
    categoriesResponse?.categories ||
    categoriesResponse?.data ||
    initialCategories;

  // Fetch personalized categories for authenticated users
  const { data: userPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch user's recent bookings to determine preferred categories
      const bookingsResponse = await apiService.getBookings({ limit: 10 });
      const bookings = Array.isArray(bookingsResponse)
        ? bookingsResponse
        : bookingsResponse.data || [];

      // Extract categories from recent bookings
      const recentCategories = bookings
        .map(
          (booking: { events?: { categories?: { name?: string } } }) =>
            booking.events?.categories?.name
        )
        .filter(Boolean);

      return {
        preferredCategories: Array.from(new Set(recentCategories)),
        recentBookings: bookings,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build search parameters for API
  const buildSearchParams = useCallback((): EventSearchParams => {
    const params: EventSearchParams = {
      page,
      limit: 12,
    };

    if (filters.query) params.q = filters.query;
    if (filters.category) params.category = filters.category;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.location) params.location = filters.location;
    if (filters.sort) params.sort = filters.sort;

    return params;
  }, [filters, page]);

  // Fetch nearby events using the location-aware hook
  const {
    data: nearbyEventsResponse,
    isLoading: nearbyEventsLoading,
    error: nearbyEventsError,
    refetch: refetchNearby,
  } = useNearbyEvents({
    radius: filters.radius,
    limit: 12,
    page,
    category: filters.category,
    search: filters.query,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    enabled: shouldUseNearbyEvents && !authLoading && locationInitialized,
  });

  // Fetch regular events using React Query
  const {
    data: eventsResponse,
    isLoading: eventsLoading,
    error: eventsError,
    refetch,
  } = useQuery({
    queryKey: ["events", buildSearchParams()],
    queryFn: async () => {
      if (useInitialData && page === 1) {
        // Return initial SSG/ISR data for first page
        return {
          events: initialEvents,
          pagination: {
            page: 1,
            limit: 12,
            total: initialTotal,
            pages: Math.ceil(initialTotal / 12),
          },
        };
      }

      const data = await apiService.getEvents(buildSearchParams());
      return data;
    },
    staleTime: useInitialData ? 0 : 2 * 60 * 1000, // 2 minutes for CSR, immediate for initial data
    enabled: !shouldUseNearbyEvents && !authLoading, // Only use when not using nearby events
  });

  // Use appropriate data based on location mode
  const activeResponse = shouldUseNearbyEvents
    ? nearbyEventsResponse
    : eventsResponse;
  const events = activeResponse?.events || [];
  const totalEvents = activeResponse?.pagination?.total || 0;
  const totalPages = shouldUseNearbyEvents
    ? nearbyEventsResponse?.pagination?.totalPages || 1
    : eventsResponse?.pagination?.pages || 1;

  // Merge loading and error states
  const isEventsLoading = shouldUseNearbyEvents
    ? nearbyEventsLoading
    : eventsLoading;
  const eventsQueryError = shouldUseNearbyEvents
    ? nearbyEventsError
    : eventsError;
  const refetchEvents = shouldUseNearbyEvents ? refetchNearby : refetch;

  // Update URL with current filters
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "date_asc") {
        params.set(key, value);
      }
    });

    if (page > 1) {
      params.set("page", page.toString());
    }

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : "/events";

    router.replace(newUrl, { scroll: false });
  }, [filters, page, router]);

  // Update URL when filters change
  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      category: "",
      dateFrom: "",
      dateTo: "",
      location: "",
      sort: "date_asc",
      locationMode: "all",
      radius: 50000,
    });
    setPage(1);
  };

  const isLoading =
    isEventsLoading || categoriesLoading || authLoading || preferencesLoading;
  const hasActiveFilters = Object.values(filters).some(
    (value) =>
      value !== "" && value !== "date_asc" && value !== "all" && value !== 50000
  );

  if (eventsQueryError || categoriesError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t load the events. Please try again.
          </p>
          <Button onClick={() => refetchEvents()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {user
                ? `Welcome back, ${user.email?.split("@")[0]}!`
                : "Discover Amazing Events"}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {user
                ? userPreferences?.preferredCategories?.length
                  ? `Based on your interest in ${userPreferences.preferredCategories
                      .slice(0, 2)
                      .join(" and ")}`
                  : "Find events tailored to your interests"
                : "Find local events, activities, concerts, workshops, and more"}
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search events..."
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                className="pl-12 pr-4 py-3 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Suggested Events Section - Show when no active filters or when specifically requested */}
      {(!hasActiveFilters || isSuggestedView) && (
        <SuggestedEvents
          title={isSuggestedView ? "Events Near You" : "Events Near You"}
          subtitle={
            isSuggestedView
              ? "Based on your location, here are events happening nearby"
              : "Discover amazing events happening in your area"
          }
          limit={6}
          showLocation={true}
          className="bg-gray-50"
        />
      )}

      {/* Filters and Controls */}
      <section className="border-b py-4">
        <div className="container mx-auto px-4">
          {/* Location Mode Toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant={filters.locationMode === "all" ? "default" : "outline"}
              onClick={() => handleFilterChange("locationMode", "all")}
              className="flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              All Events
            </Button>
            <Button
              variant={
                filters.locationMode === "nearby" ? "default" : "outline"
              }
              onClick={() => handleFilterChange("locationMode", "nearby")}
              disabled={!hasCoordinates}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Nearby Events
              {!hasCoordinates && " (Location Required)"}
            </Button>
            {filters.locationMode === "nearby" && hasCoordinates && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Within</span>
                <select
                  value={filters.radius}
                  onChange={(e) => handleFilterChange("radius", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  <option value="5000">5 km</option>
                  <option value="10000">10 km</option>
                  <option value="25000">25 km</option>
                  <option value="50000">50 km</option>
                  <option value="100000">100 km</option>
                </select>
                {location?.city && <span>of {location.city}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        handleFilterChange("category", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category: Category) => (
                        <option key={category.id} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date From */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        handleFilterChange("dateFrom", e.target.value)
                      }
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        handleFilterChange("dateTo", e.target.value)
                      }
                    />
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select
                      value={filters.sort}
                      onChange={(e) =>
                        handleFilterChange(
                          "sort",
                          e.target.value as FilterState["sort"]
                        )
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {filters.locationMode === "nearby" && (
                        <option value="distance_asc">
                          Distance (Closest First)
                        </option>
                      )}
                      <option value="date_asc">Date (Earliest First)</option>
                      <option value="date_desc">Date (Latest First)</option>
                      <option value="price_asc">Price (Low to High)</option>
                      <option value="price_desc">Price (High to Low)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Events Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Results Info */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                {isLoading ? (
                  "Loading events..."
                ) : (
                  <>
                    Showing {events.length} of {totalEvents} event
                    {totalEvents !== 1 ? "s" : ""}
                    {hasActiveFilters && " (filtered)"}
                    {user &&
                      (userPreferences?.preferredCategories?.length ?? 0) >
                        0 && (
                        <span className="ml-2 text-sm text-primary">
                          ✨ Personalized for you
                        </span>
                      )}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Events Grid/List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-96 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No events found
              </h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters
                  ? "Try adjusting your filters or search terms."
                  : "No events are available at the moment."}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {events.map((event: Event) => (
                <EventCard key={event.id} event={event} className={viewMode} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum =
                    Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
