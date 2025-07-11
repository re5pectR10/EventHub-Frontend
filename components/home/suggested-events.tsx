"use client";

import Link from "next/link";
import { MapPin, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { useSuggestedEvents } from "@/lib/api";
import type { Event } from "@/lib/types";

interface SuggestedEventsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  showLocation?: boolean;
  className?: string;
}

function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.start_date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isTomorrow =
    eventDate.toDateString() ===
    new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  const formatEventDate = (date: Date) => {
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get the minimum ticket price
  const minPrice = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((ticket) => ticket.price))
    : 0;

  // Calculate total available tickets
  const totalAvailableTickets =
    event.ticket_types?.reduce(
      (sum, ticket) => sum + (ticket.quantity_available - ticket.quantity_sold),
      0
    ) || 0;

  // Get primary event image
  const primaryImage =
    event.event_images?.find((img) => img.is_primary) ||
    event.event_images?.[0];

  return (
    <Link href={`/events/${event.slug}`} className="group">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-[16/9] overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || event.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <PlaceholderImage title={event.title} className="h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          {/* Event Category Badge */}
          {event.event_categories && (
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 bg-white/90 text-gray-800"
            >
              {event.event_categories.name}
            </Badge>
          )}

          {/* Price Badge */}
          <Badge
            variant="default"
            className="absolute top-3 right-3 bg-blue-600 text-white"
          >
            {minPrice === 0 ? "Free" : `From $${minPrice}`}
          </Badge>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Event Title */}
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {event.title}
          </h3>

          {/* Event Date and Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatEventDate(eventDate)}</span>
            <span>•</span>
            <span>{formatEventTime(eventDate)}</span>
          </div>

          {/* Event Location */}
          {event.location_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location_name}</span>
            </div>
          )}

          {/* Available Tickets */}
          {totalAvailableTickets > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                {totalAvailableTickets} ticket
                {totalAvailableTickets !== 1 ? "s" : ""} available
              </span>
            </div>
          )}

          {/* Event Description Preview */}
          {event.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Organizer */}
          {event.organizers && (
            <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-2">
              <span>By</span>
              <span className="font-medium">
                {event.organizers.business_name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function SuggestedEvents({
  title = "Events Near You",
  subtitle = "Discover amazing events happening in your area",
  limit = 6,
  showLocation = true,
  className = "",
}: SuggestedEventsProps) {
  const { data, isLoading, error } = useSuggestedEvents({ limit });

  if (isLoading) {
    return (
      <section className={`py-12 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-64 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error("Suggested Events Error:", error);
    return null; // Fail silently for UX
  }

  if (!data?.events?.length) {
    return (
      <section className={`py-12 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>

          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No events found in your area
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn&apos;t find any events near you right now. Check out
                all events or try a different location.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Browse All Events
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const locationInfo = data.userLocation;
  const locationText = locationInfo
    ? [locationInfo.city, locationInfo.region, locationInfo.country]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
          <div className="space-y-2">
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
            {showLocation && locationText && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>Based on your location: {locationText}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {data.events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* View More Button */}
        {data.events.length >= limit && (
          <div className="text-center">
            <Link
              href="/events?suggested=true"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View More Events Near You
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
