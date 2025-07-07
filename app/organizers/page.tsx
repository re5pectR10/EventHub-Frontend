"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiService } from "@/lib/api";
import { toast } from "@/lib/notifications";
import type { Organizer } from "@/lib/types";

export default function OrganizersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch organizers using React Query with search parameters
  const {
    data: organizers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["organizers", { search: debouncedSearchQuery }],
    queryFn: async () => {
      const params = debouncedSearchQuery.trim()
        ? { search: debouncedSearchQuery.trim() }
        : undefined;
      const data = await apiService.getOrganizers(params);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleRetry = () => {
    refetch();
    toast.success("Refreshing organizers...");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <div className="h-8 bg-gray-200 animate-pulse rounded w-64 mx-auto mb-4" />
              <div className="h-4 bg-gray-200 animate-pulse rounded w-96 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-gray-200 animate-pulse" />
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 animate-pulse rounded mb-2" />
                    <div className="h-4 bg-gray-200 animate-pulse rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to Load Organizers
              </h3>
              <p className="text-gray-600 mb-6">
                {error instanceof Error
                  ? error.message
                  : "Something went wrong while loading organizers."}
              </p>
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Event Organizers
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover amazing event organizers in your area and explore their
              upcoming events
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search organizers by name, description, or location..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-12 pr-4 py-3 text-lg"
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-8">
            <p className="text-gray-600">
              {organizers.length} organizer
              {organizers.length !== 1 ? "s" : ""} found
              {searchQuery && (
                <span className="ml-2 text-sm">
                  for &quot;{searchQuery}&quot;
                </span>
              )}
            </p>
          </div>

          {/* Organizers Grid */}
          {organizers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No organizers found
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? "Try adjusting your search terms or browse all organizers."
                  : "No organizers are available at the moment."}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setDebouncedSearchQuery("");
                  }}
                  className="mt-4"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {organizers.map((organizer: Organizer) => (
                <Card
                  key={organizer.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Organizer Image */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                    {organizer.logo_url ? (
                      <Image
                        src={organizer.logo_url}
                        alt={organizer.business_name || organizer.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement
                            ?.querySelector(".fallback-icon")
                            ?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex items-center justify-center fallback-icon ${
                        organizer.logo_url ? "hidden" : ""
                      }`}
                    >
                      <Users className="w-16 h-16 text-white/80" />
                    </div>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {organizer.business_name || organizer.name}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    {/* Description */}
                    {organizer.description && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {organizer.description}
                      </p>
                    )}

                    {/* Organizer Details */}
                    <div className="space-y-3 mb-6">
                      {organizer.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {organizer.location}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        Member since{" "}
                        {new Date(organizer.created_at).getFullYear()}
                      </div>

                      {organizer.events_count !== undefined && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Star className="w-4 h-4 mr-2 text-gray-400" />
                          {organizer.events_count} event
                          {organizer.events_count !== 1 ? "s" : ""} organized
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        className="w-full"
                        onClick={() =>
                          (window.location.href = `/organizers/${organizer.id}`)
                        }
                      >
                        View Profile
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          (window.location.href = `/events?organizer=${organizer.id}`)
                        }
                      >
                        View Events
                      </Button>

                      {organizer.website && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() =>
                            window.open(organizer.website, "_blank")
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visit Website
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
