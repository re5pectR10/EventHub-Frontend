"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Users, Tag } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Event, EventCardProps } from "@/lib/types";

export function EventCard({ event, className }: EventCardProps) {
  const primaryImage =
    event.event_images?.find((img) => img.is_primary)?.image_url ||
    event.event_images?.[0]?.image_url ||
    "/placeholder-event.jpg";

  const startDate = new Date(event.start_date);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const minPrice = Math.min(
    ...(event.ticket_types?.map((t) => t.price) || [0])
  );
  const maxPrice = Math.max(
    ...(event.ticket_types?.map((t) => t.price) || [0])
  );

  const priceDisplay = () => {
    if (event.ticket_types?.length === 0) return "Free";
    if (minPrice === maxPrice) return `$${minPrice}`;
    if (minPrice === 0) return `Free - $${maxPrice}`;
    return `$${minPrice} - $${maxPrice}`;
  };

  return (
    <Card
      className={`group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden ${className}`}
    >
      <Link href={`/events/${event.slug}`}>
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={primaryImage}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {event.featured && (
            <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Featured
            </div>
          )}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600">
                {startDate
                  .toLocaleDateString("en-US", { month: "short" })
                  .toUpperCase()}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {startDate.getDate()}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Tag className="w-3 h-3 mr-1" />
                {event.event_categories?.name || "General"}
              </span>
              <span className="text-sm font-semibold text-green-600">
                {priceDisplay()}
              </span>
            </div>

            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>
                  {formatDate(startDate)} at {formatTime(startDate)}
                </span>
              </div>

              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="line-clamp-1">{event.location_name}</span>
              </div>

              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>By {event.organizers?.business_name}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button
            variant="outline"
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          >
            View Details
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
