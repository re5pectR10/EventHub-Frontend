"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Globe,
  Mail,
  Share2,
  Heart,
  ArrowLeft,
  Tag,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventBySlug } from "@/lib/api";

export default function EventDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [selectedImage, setSelectedImage] = useState(0);

  // Use React Query hook
  const {
    data: event,
    isLoading: loading,
    error: queryError,
  } = useEventBySlug(slug);

  const error = queryError?.message || null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container-clean py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container-clean py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Event Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              {error || "The event you are looking for does not exist."}
            </p>
            <Link href="/events">
              <Button>Browse All Events</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const images =
    event.event_images?.sort((a, b) => a.display_order - b.display_order) || [];
  const primaryImage = images.find((img) => img.is_primary) || images[0];

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
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b bg-gray-50">
          <div className="container-clean py-4">
            <Link
              href="/events"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative">
          {primaryImage && (
            <div className="relative h-96 w-full overflow-hidden">
              <Image
                src={primaryImage.image_url}
                alt={primaryImage.alt_text || event.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/20"></div>

              {/* Event Badge */}
              {event.featured && (
                <div className="absolute top-6 left-6 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Featured Event
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute top-6 right-6 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white"
                >
                  <Heart className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </section>

        <div className="container-clean py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {event.title}
                </h1>

                {/* Event Meta */}
                <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span>{formatDate(startDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <span>{formatTime(startDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>{event.location_name}</span>
                  </div>
                  {event.event_categories && (
                    <div className="flex items-center">
                      <Tag className="w-5 h-5 mr-2" />
                      <span>{event.event_categories.name}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-2xl font-bold text-green-600">
                    {priceDisplay()}
                  </span>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Images */}
              {images.length > 1 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.slice(1).map((image, index) => (
                      <div
                        key={index}
                        className="relative h-48 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => setSelectedImage(index + 1)}
                      >
                        <Image
                          src={image.image_url}
                          alt={image.alt_text || `Event image ${index + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Location</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">
                    {event.location_name}
                  </h3>
                  <p className="text-gray-600 flex items-start">
                    <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    {event.location_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                {/* Booking Card */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Get Your Tickets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {event.ticket_types && event.ticket_types.length > 0 ? (
                      <div className="space-y-4">
                        {event.ticket_types.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="flex justify-between items-center p-3 border rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium">{ticket.name}</h4>
                              <p className="text-sm text-gray-600">
                                {ticket.description}
                              </p>
                              <p className="text-sm text-gray-500">
                                {ticket.quantity_available -
                                  ticket.quantity_sold}{" "}
                                available
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                ${ticket.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <Link href={`/events/${event.slug}/book`}>
                          <Button className="w-full" size="lg">
                            Book Now
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-600 mb-4">
                          Tickets are not available for this event yet.
                        </p>
                        <Button disabled size="lg" className="w-full">
                          Coming Soon
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Organizer Info */}
                {event.organizers && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Organized by</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                          <Users className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {event.organizers.business_name}
                          </h4>
                          {event.organizers.description && (
                            <p className="text-sm text-gray-600">
                              {event.organizers.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/organizers/${event.organizers.id}`}>
                          <Button variant="outline" size="sm">
                            <Users className="w-4 h-4 mr-1" />
                            View Profile
                          </Button>
                        </Link>
                        {event.organizers.website && (
                          <a
                            href={event.organizers.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <Globe className="w-4 h-4 mr-1" />
                              Website
                            </Button>
                          </a>
                        )}
                        {event.organizers.contact_email && (
                          <a href={`mailto:${event.organizers.contact_email}`}>
                            <Button variant="outline" size="sm">
                              <Mail className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
