"use client";

import { useState } from "react";
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
import {
  useOrganizerEvents,
  useDeleteEvent,
  useUpdateEventStatus,
} from "@/lib/api";
import type { Event } from "@/lib/types";

export default function EventsManagementPage() {
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Use React Query hooks
  const {
    data: events = [],
    isLoading: loading,
    error: queryError,
  } = useOrganizerEvents();

  const deleteEventMutation = useDeleteEvent();
  const updateEventStatusMutation = useUpdateEventStatus();

  // Set error from query if exists
  if (queryError && !error) {
    setError(queryError.message);
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      return;
    }

    setError(null);

    try {
      await deleteEventMutation.mutateAsync(eventId);
    } catch (error) {
      console.error("Error deleting event:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete event. Please try again."
      );
    }
  };

  const handleStatusChange = async (
    eventId: string,
    newStatus: "draft" | "published" | "cancelled"
  ) => {
    setError(null);

    try {
      await updateEventStatusMutation.mutateAsync({
        id: eventId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating event status:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update event status. Please try again."
      );
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Events</h1>
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
                      <CardDescription className="text-sm text-gray-600">
                        {new Date(event.start_date).toLocaleDateString()} at{" "}
                        {event.start_time} • {event.location_name}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${event.slug}`}>
                        <Button variant="outline" size="sm">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/dashboard/events/${event.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <EditIcon className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/dashboard/events/${event.id}/tickets`}>
                        <Button variant="outline" size="sm">
                          <TicketIcon className="h-4 w-4 mr-1" />
                          Tickets
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deleteEventMutation.isPending}
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Ticket Sales
                      </h4>
                      <p className="text-2xl font-bold text-green-600">
                        {getTotalSold(event.ticket_types || [])}
                      </p>
                      <p className="text-sm text-gray-500">tickets sold</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Revenue
                      </h4>
                      <p className="text-2xl font-bold text-blue-600">
                        ${getTotalRevenue(event.ticket_types || []).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">total revenue</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                      <select
                        value={event.status}
                        onChange={(e) =>
                          handleStatusChange(
                            event.id,
                            e.target.value as
                              | "draft"
                              | "published"
                              | "cancelled"
                          )
                        }
                        disabled={updateEventStatusMutation.isPending}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {event.description && (
                    <div className="mt-4">
                      <p className="text-gray-600 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
