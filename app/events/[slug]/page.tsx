"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { apiService } from "@/lib/api";
import type { Event } from "@/lib/types";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getEventBySlug(slug);

        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setEvent(response.data);
        } else if (response.event) {
          setEvent(response.event);
        } else {
          setError("No event data received");
        }
      } catch (err) {
        setError("Failed to fetch event details");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

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
            <div className="lg:col-span-2 space-y-8">
              {/* Event Header */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    <Tag className="w-3 h-3 mr-1" />
                    {event.event_categories?.name || "General"}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm font-medium text-green-600">
                    {priceDisplay()}
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {event.title}
                </h1>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(startDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {formatTime(startDate)} - {formatTime(endDate)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.location_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>By {event.organizers?.business_name}</span>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              {images.length > 1 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Event Photos</h2>
                  <div className="grid grid-cols-4 gap-2">
                    {images.slice(0, 8).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden ${
                          selectedImage === index ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <Image
                          src={image.image_url}
                          alt={image.alt_text || `Event photo ${index + 1}`}
                          fill
                          className="object-cover hover:scale-105 transition-transform"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-4">About This Event</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </div>

              {/* Location Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{event.location_name}</p>
                    <p className="text-gray-600">{event.location_address}</p>
                    {/* You could add a map component here */}
                  </div>
                </CardContent>
              </Card>

              {/* Organizer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Event Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h3 className="font-medium text-lg">
                      {event.organizers?.business_name}
                    </h3>
                    {event.organizers?.description && (
                      <p className="text-gray-600">
                        {event.organizers.description}
                      </p>
                    )}
                    <div className="flex gap-4">
                      {event.organizers?.contact_email && (
                        <a
                          href={`mailto:${event.organizers.contact_email}`}
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Contact
                        </a>
                      )}
                      {event.organizers?.website && (
                        <a
                          href={event.organizers.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Ticket Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Tickets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.ticket_types?.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{ticket.name}</h4>
                        <span className="font-semibold text-lg">
                          {ticket.price === 0 ? "Free" : `$${ticket.price}`}
                        </span>
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {ticket.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                        <span>
                          Available:{" "}
                          {ticket.quantity_available - ticket.quantity_sold}
                        </span>
                        <span>Sold: {ticket.quantity_sold}</span>
                      </div>
                      <Button
                        className="w-full"
                        disabled={
                          ticket.quantity_available <= ticket.quantity_sold
                        }
                        onClick={() =>
                          router.push(`/events/${params.slug}/book`)
                        }
                      >
                        {ticket.quantity_available <= ticket.quantity_sold
                          ? "Sold Out"
                          : "Select"}
                      </Button>
                    </div>
                  ))}

                  {event.ticket_types?.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-600 mb-4">This is a free event</p>
                      <Button
                        className="w-full"
                        onClick={() =>
                          router.push(`/events/${params.slug}/book`)
                        }
                      >
                        Register for Free
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date</span>
                    <span className="font-medium">{formatDate(startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Time</span>
                    <span className="font-medium">{formatTime(startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Time</span>
                    <span className="font-medium">{formatTime(endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category</span>
                    <span className="font-medium">
                      {event.event_categories?.name || "General"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium capitalize">
                      {event.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
