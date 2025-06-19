"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  TicketIcon,
} from "lucide-react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { apiService } from "@/lib/api";
import type { Event } from "@/lib/types";

export default function EventsManagementPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadEvents() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/signin");
          return;
        }

        const response = await apiService.getOrganizerEvents();

        if (response.error) {
          setError(response.error);
        } else {
          setEvents(response.events || []);
        }
      } catch (error) {
        console.error("Error loading events:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const handleDeleteEvent = async (eventId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(eventId);
    setError(null);

    try {
      const response = await apiService.deleteEvent(eventId);

      if (response.error) {
        throw new Error(response.error);
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch (error) {
      console.error("Error deleting event:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete event. Please try again."
      );
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (
    eventId: string,
    newStatus: "draft" | "published" | "cancelled"
  ) => {
    setUpdatingStatus(eventId);
    setError(null);

    try {
      const response = await apiService.updateEventStatus(eventId, newStatus);

      if (response.error) {
        throw new Error(response.error);
      }

      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, status: newStatus } : event
        )
      );
    } catch (error) {
      console.error("Error updating event status:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update event status. Please try again."
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getTotalSold = (ticketTypes: Event["ticket_types"]) => {
    return ticketTypes.reduce(
      (total, ticket) => total + ticket.quantity_sold,
      0
    );
  };

  const getTotalRevenue = (ticketTypes: Event["ticket_types"]) => {
    return ticketTypes.reduce(
      (total, ticket) => total + ticket.price * ticket.quantity_sold,
      0
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
            <p className="mt-2 text-gray-600">Manage and track your events</p>
          </div>
          <Link href="/dashboard/events/create">
            <Button className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Dashboard Navigation */}
        <DashboardNav />

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first event to get started
              </p>
              <Link href="/dashboard/events/create">
                <Button>Create Your First Event</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        {getStatusBadge(event.status)}
                        {event.featured && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {event.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link href={`/events/${event.slug}`}>
                        <Button variant="outline" size="sm" title="View Event">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/events/${event.id}/edit`}>
                        <Button variant="outline" size="sm" title="Edit Event">
                          <EditIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/events/${event.id}/tickets`}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Manage Tickets"
                        >
                          <TicketIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deleting === event.id}
                        className="text-red-600 hover:text-red-700"
                        title="Delete Event"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Date & Time
                      </p>
                      <p className="text-sm text-gray-900">
                        {new Date(event.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Location
                      </p>
                      <p className="text-sm text-gray-900">
                        {event.location_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Tickets Sold
                      </p>
                      <p className="text-sm text-gray-900">
                        {getTotalSold(event.ticket_types)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Revenue
                      </p>
                      <p className="text-sm text-gray-900">
                        ${getTotalRevenue(event.ticket_types).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {event.ticket_types.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500">
                          Ticket Types
                        </p>
                        <Link href={`/dashboard/events/${event.id}/tickets`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Manage Tickets
                          </Button>
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.ticket_types.map((ticket) => (
                          <Badge key={ticket.id} variant="outline">
                            {ticket.name}: ${ticket.price} (
                            {ticket.quantity_sold}/{ticket.quantity_available})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-500">
                          No ticket types yet
                        </p>
                        <Link href={`/dashboard/events/${event.id}/tickets`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Create Tickets
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Status Controls */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Event Status
                    </p>
                    <div className="flex gap-2">
                      {event.status !== "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(event.id, "published")
                          }
                          disabled={updatingStatus === event.id}
                          className="text-green-600 hover:text-green-700"
                        >
                          {updatingStatus === event.id
                            ? "Updating..."
                            : "Publish"}
                        </Button>
                      )}
                      {event.status !== "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(event.id, "draft")}
                          disabled={updatingStatus === event.id}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          {updatingStatus === event.id
                            ? "Updating..."
                            : "Draft"}
                        </Button>
                      )}
                      {event.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(event.id, "cancelled")
                          }
                          disabled={updatingStatus === event.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {updatingStatus === event.id
                            ? "Updating..."
                            : "Cancel"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
