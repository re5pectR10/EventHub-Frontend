"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import type { Event } from "@/lib/types";

export function FeaturedEvents() {
  const {
    data: events = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const response = await apiService.getFeaturedEvents();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.events || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return (
      <section className="section-clean">
        <div className="container-clean">
          <h2 className="text-center mb-16">Featured Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-clean animate-pulse">
                <div className="h-48 bg-muted rounded-lg mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section-clean">
        <div className="container-clean text-center">
          <h2 className="mb-8">Featured Events</h2>
          <p className="text-destructive">
            Error loading events:{" "}
            {error instanceof Error ? error.message : error}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-clean">
      <div className="container-clean">
        <div className="text-center mb-16">
          <h2 className="mb-6">Featured Events</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover amazing events happening in your area. From concerts to
            workshops, find experiences that inspire and connect you with your
            community.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No featured events available at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group card-clean transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Clean Event Image Area */}
                <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-lg"></div>
                  {event.event_categories && (
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-primary bg-background/90 backdrop-blur-sm">
                        📅 {event.event_categories.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Clean Event Content */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                    {event.title}
                  </h3>

                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-3 text-primary" />
                      <span>
                        {new Date(event.start_date).toLocaleDateString()} at{" "}
                        {new Date(event.start_date).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-3 text-primary" />
                      <span className="truncate">{event.location_name}</span>
                    </div>

                    {event.organizers && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-3 text-primary" />
                        <span className="truncate">
                          {event.organizers.business_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <Button className="btn-clean btn-primary" asChild>
            <Link href="/events">View All Events</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
