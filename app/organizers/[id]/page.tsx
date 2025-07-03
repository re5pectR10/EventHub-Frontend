"use client";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiService } from "@/lib/api";
import { toast } from "@/lib/notifications";
import type { Event } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function OrganizerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const organizerId = params.id as string;

  // Fetch organizer profile
  const {
    data: organizer,
    isLoading: isLoadingOrganizer,
    error: organizerError,
    refetch: refetchOrganizer,
  } = useQuery({
    queryKey: ["organizer", organizerId],
    queryFn: async () => {
      const response = await apiService.getOrganizerById(organizerId);
      if (response.error) {
        throw new Error(response.error);
      }
      if (!response.data) {
        throw new Error("Organizer not found");
      }
      return response.data;
    },
    enabled: !!organizerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fetch organizer's events
  const {
    data: events = [],
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["organizer-events", organizerId],
    queryFn: async () => {
      const response = await apiService.getOrganizerEventsById(organizerId);
      if (response.error) {
        throw new Error(response.error);
      }
      console.log(response);
      if (response.events) {
        // Filter events by organizer (ideally this should be done in the API)
        return response.events.filter(
          (event: Event) => event.organizers?.id === organizerId
        );
      }
      return [];
    },
    enabled: !!organizerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const isLoading = isLoadingOrganizer || isLoadingEvents;
  const error = organizerError || eventsError;

  const handleRetry = () => {
    refetchOrganizer();
    refetchEvents();
    toast.success("Refreshing organizer data...");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organizer profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !organizer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? "Failed to Load Organizer" : "Organizer Not Found"}
          </h1>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "The organizer you're looking for doesn't exist."}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            {error && (
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Organizer Profile */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  {organizer.logo_url ? (
                    <img
                      src={organizer.logo_url}
                      alt={organizer.business_name || organizer.name}
                      className="h-16 w-16 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center ${
                      organizer.logo_url ? "hidden" : ""
                    }`}
                  >
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {organizer.business_name || organizer.name}
                    </CardTitle>
                    <CardDescription>Event Organizer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {organizer.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">About</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {organizer.description}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {organizer.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{organizer.location}</span>
                    </div>
                  )}

                  {organizer.contact_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <a
                        href={`mailto:${organizer.contact_email}`}
                        className="hover:text-blue-600 break-all"
                      >
                        {organizer.contact_email}
                      </a>
                    </div>
                  )}

                  {organizer.website && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                      <a
                        href={organizer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 break-all flex items-center"
                      >
                        {organizer.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      Member since{" "}
                      {new Date(organizer.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{events.length} events organized</span>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="pt-4 space-y-2">
                  {organizer.contact_email && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        window.open(`mailto:${organizer.contact_email}`)
                      }
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Organizer
                    </Button>
                  )}

                  {organizer.website && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(organizer.website, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Events by {organizer.business_name || organizer.name}
                </CardTitle>
                <CardDescription>
                  {events.length === 0
                    ? "No events available"
                    : `${events.length} event${
                        events.length === 1 ? "" : "s"
                      } found`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingEvents ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : eventsError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Failed to Load Events
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Something went wrong while loading events.
                    </p>
                    <Button
                      onClick={refetchEvents}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Events Yet
                    </h3>
                    <p className="text-gray-600">
                      This organizer hasn&apos;t published any events yet. Check
                      back later!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map((event: Event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
