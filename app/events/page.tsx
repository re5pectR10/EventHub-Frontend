"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEvents, useCategories } from "@/lib/api";
import { Search, Filter, SlidersHorizontal, Grid, List } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { EventSearchParams } from "@/lib/types";

interface FilterState {
  query: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  location: string;
  sort: "date_asc" | "date_desc" | "price_asc" | "price_desc";
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<FilterState>({
    query: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    location: searchParams.get("location") || "",
    sort: (searchParams.get("sort") as FilterState["sort"]) || "date_asc",
  });

  // Build search params for React Query
  const eventSearchParams: EventSearchParams = {
    page: currentPage,
    limit: 12,
    ...(filters.query && { query: filters.query }),
    ...(filters.category && { category: filters.category }),
    ...(filters.dateFrom && { date_from: filters.dateFrom }),
    ...(filters.dateTo && { date_to: filters.dateTo }),
    ...(filters.location && { location: filters.location }),
    sort: filters.sort,
  };

  // React Query hooks
  const {
    data: eventsData,
    isLoading: loading,
    error: eventsError,
  } = useEvents(eventSearchParams);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const events = eventsData?.events || [];
  const totalPages = eventsData?.pagination?.pages || 1;
  const error = eventsError?.message || categoriesError?.message || null;

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.category) params.set("category", filters.category);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.location) params.set("location", filters.location);
    if (filters.sort !== "date_asc") params.set("sort", filters.sort);

    const queryString = params.toString();
    router.push(`/events${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [filters, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 500);

    return () => clearTimeout(timer);
  }, [updateURL]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      category: "",
      dateFrom: "",
      dateTo: "",
      location: "",
      sort: "date_asc",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.query ||
      filters.category ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.location ||
      filters.sort !== "date_asc"
  );

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container-clean">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Discover Local Events
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Find amazing events and activities happening in your area
              </p>

              {/* Main Search */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search events, activities, or keywords..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange("query", e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Controls */}
        <section className="border-b bg-white sticky top-16 z-40">
          <div className="container-clean py-4">
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
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </Button>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    Clear all
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                  className="px-3 py-2 border border-input rounded-md text-sm bg-background"
                >
                  <option value="date_asc">Date: Earliest first</option>
                  <option value="date_desc">Date: Latest first</option>
                  <option value="price_asc">Price: Low to high</option>
                  <option value="price_desc">Price: High to low</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) =>
                          handleFilterChange("category", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                        disabled={categoriesLoading}
                      >
                        <option value="">All categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
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

                    <div>
                      <label className="block text-sm font-medium mb-2">
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

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Location
                      </label>
                      <Input
                        type="text"
                        placeholder="City, venue, address..."
                        value={filters.location}
                        onChange={(e) =>
                          handleFilterChange("location", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results count */}
            <div className="text-sm text-gray-600">
              {loading ? "Loading..." : `${events.length} events found`}
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="container-clean py-8">
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or browse all events.
              </p>
              <Button onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div
                className={`grid gap-6 ${
                  viewMode === "grid"
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    className={viewMode === "list" ? "md:flex md:flex-row" : ""}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Previous
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;

                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Organizer CTA Section */}
        <section className="bg-primary/5 py-16">
          <div className="container-clean">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to host your own event?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Join thousands of organizers who trust our platform to manage
                their events, sell tickets, and connect with their audience.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="btn-clean btn-primary">
                  <Link href="/dashboard">Start Creating Events</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/organizers">Browse Organizers</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
