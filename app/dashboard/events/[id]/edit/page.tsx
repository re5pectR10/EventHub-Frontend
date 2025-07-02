"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useCategories,
  useEventById,
  useUpdateEvent,
  useTicketsByEvent,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
} from "@/lib/api";
import type { Event, EventFormData, TicketTypeFormData } from "@/lib/types";

// Interface for event data from API that includes all necessary properties
interface EventWithFormData extends Event {
  category_id: string;
  capacity: number;
}

// Alias for local usage
type EditableEvent = EventFormData;
type TicketType = TicketTypeFormData & { id?: string };

export default function EditEventPage() {
  const [event, setEvent] = useState<EditableEvent>({
    title: "",
    description: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    location_name: "",
    location_address: "",
    category_id: "",
    capacity: 100,
    featured: false,
    status: "draft",
  });
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  // Use React Query hooks
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useEventById(eventId);

  const {
    data: existingTickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useTicketsByEvent(eventId);

  const updateEventMutation = useUpdateEvent();
  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();
  const deleteTicketMutation = useDeleteTicket();

  const error =
    categoriesError?.message ||
    eventError?.message ||
    ticketsError?.message ||
    null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    } else if (user) {
      setLoading(false);
    }
  }, [user, authLoading, router]);

  // Update form data when event data is loaded
  useEffect(() => {
    if (eventData) {
      // Type the eventData properly - it should have category_id from the database
      const typedEventData = eventData as EventWithFormData;

      setEvent({
        title: eventData.title || "",
        description: eventData.description || "",
        start_date: eventData.start_date || "",
        start_time: eventData.start_time || "",
        end_date: eventData.end_date || "",
        end_time: eventData.end_time || "",
        location_name: eventData.location_name || "",
        location_address: eventData.location_address || "",
        category_id: typedEventData.category_id || "",
        capacity: typedEventData.capacity || 100,
        featured: eventData.featured || false,
        status: eventData.status || "draft",
      });
    }
  }, [eventData]);

  // Update ticket types when existing tickets are loaded
  useEffect(() => {
    if (existingTickets) {
      setTicketTypes(
        existingTickets.map((ticket) => ({
          id: ticket.id,
          name: ticket.name || "",
          description: ticket.description || "",
          price: ticket.price || 0,
          quantity_available: ticket.quantity_available || 100,
          sale_start_date: ticket.sale_start_date || "",
          sale_end_date: ticket.sale_end_date || "",
          max_per_order: ticket.max_per_order || 10,
        }))
      );
    }
  }, [existingTickets]);

  const addTicketType = () => {
    const newTicket: TicketType = {
      name: "",
      description: "",
      price: 0,
      quantity_available: 100,
      sale_start_date: "",
      sale_end_date: "",
      max_per_order: 10,
    };
    setTicketTypes([...ticketTypes, newTicket]);
  };

  const removeTicketType = async (index: number) => {
    const ticket = ticketTypes[index];

    // If the ticket has an ID, delete it from the database
    if (ticket.id) {
      try {
        await deleteTicketMutation.mutateAsync({
          eventId: eventId,
          ticketTypeId: ticket.id,
        });
        setSuccess("Ticket type deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error("Error deleting ticket:", error);
      }
    }

    // Remove from local state
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (
    index: number,
    field: keyof TicketType,
    value: string | number
  ) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    setTicketTypes(updatedTickets);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!event.title.trim()) {
      errors.title = "Event title is required";
    }

    if (!event.category_id) {
      errors.category_id = "Please select a category";
    }

    if (!event.start_date) {
      errors.start_date = "Start date is required";
    }

    if (!event.start_time) {
      errors.start_time = "Start time is required";
    }

    if (!event.location_name.trim()) {
      errors.location_name = "Venue name is required";
    }

    if (!event.location_address.trim()) {
      errors.location_address = "Venue address is required";
    }

    // Validate that start date is not in the past (only for future events)
    if (event.start_date) {
      const startDateTime = new Date(
        `${event.start_date}T${event.start_time || "00:00"}`
      );
      // Only validate if it's more than a day in the past to allow editing recent events
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      if (startDateTime < oneDayAgo) {
        errors.start_date = "Event date is too far in the past";
      }
    }

    // Validate end date if provided
    if (event.end_date && event.start_date) {
      const startDateTime = new Date(
        `${event.start_date}T${event.start_time || "00:00"}`
      );
      const endDateTime = new Date(
        `${event.end_date}T${event.end_time || "23:59"}`
      );
      if (endDateTime < startDateTime) {
        errors.end_date = "End date cannot be before start date";
      }
    }

    // Validate ticket types
    ticketTypes.forEach((ticket, index) => {
      if (!ticket.name.trim()) {
        errors[`ticket_${index}_name`] = "Ticket name is required";
      }
      if (ticket.price < 0) {
        errors[`ticket_${index}_price`] = "Price cannot be negative";
      }
      if (ticket.quantity_available <= 0) {
        errors[`ticket_${index}_quantity`] = "Quantity must be greater than 0";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setSuccess(null);
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Update event
      const eventResponse = await updateEventMutation.mutateAsync({
        id: eventId,
        eventData: event,
      });

      if (eventResponse.error) {
        throw new Error(eventResponse.error);
      }

      // Handle ticket types
      for (const ticket of ticketTypes) {
        if (ticket.id) {
          // Update existing ticket
          await updateTicketMutation.mutateAsync({
            eventId: eventId,
            ticketTypeId: ticket.id,
            ticketData: ticket,
          });
        } else {
          // Create new ticket
          await createTicketMutation.mutateAsync({
            ...ticket,
            event_id: eventId,
          });
        }
      }

      setSuccess("Event updated successfully!");

      // Redirect to events page after a short delay
      setTimeout(() => {
        router.push("/dashboard/events");
      }, 1000);
    } catch (error) {
      console.error("Error updating event:", error);
      // Error is handled by the mutation itself
    }
  };

  const handleInputChange = (
    field: keyof EditableEvent,
    value: string | number | boolean
  ) => {
    setEvent((prev) => ({ ...prev, [field]: value }));
  };

  if (
    loading ||
    authLoading ||
    categoriesLoading ||
    eventLoading ||
    ticketsLoading
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error && !event.title) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
          <p className="mt-2 text-gray-600">
            The event you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to edit it.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/dashboard/events")}
          >
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const isSubmitting =
    updateEventMutation.isPending ||
    createTicketMutation.isPending ||
    updateTicketMutation.isPending ||
    deleteTicketMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard/events"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="mt-2 text-gray-600">
            Update your event details and manage ticket types
          </p>
        </div>

        <DashboardNav />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              Update the information about your event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Event Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    value={event.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter event title"
                    required
                    className={validationErrors.title ? "border-red-500" : ""}
                  />
                  {validationErrors.title && (
                    <p className="text-sm text-red-600">
                      {validationErrors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="category_id" className="text-sm font-medium">
                    Category *
                  </label>
                  <select
                    id="category_id"
                    value={event.category_id}
                    onChange={(e) =>
                      handleInputChange("category_id", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.category_id
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.category_id && (
                    <p className="text-sm text-red-600">
                      {validationErrors.category_id}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  value={event.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your event..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="start_date" className="text-sm font-medium">
                    Start Date *
                  </label>
                  <Input
                    id="start_date"
                    type="date"
                    value={event.start_date}
                    onChange={(e) =>
                      handleInputChange("start_date", e.target.value)
                    }
                    required
                    className={
                      validationErrors.start_date ? "border-red-500" : ""
                    }
                  />
                  {validationErrors.start_date && (
                    <p className="text-sm text-red-600">
                      {validationErrors.start_date}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="start_time" className="text-sm font-medium">
                    Start Time *
                  </label>
                  <Input
                    id="start_time"
                    type="time"
                    value={event.start_time}
                    onChange={(e) =>
                      handleInputChange("start_time", e.target.value)
                    }
                    required
                    className={
                      validationErrors.start_time ? "border-red-500" : ""
                    }
                  />
                  {validationErrors.start_time && (
                    <p className="text-sm text-red-600">
                      {validationErrors.start_time}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="end_date" className="text-sm font-medium">
                    End Date
                  </label>
                  <Input
                    id="end_date"
                    type="date"
                    value={event.end_date}
                    onChange={(e) =>
                      handleInputChange("end_date", e.target.value)
                    }
                    className={
                      validationErrors.end_date ? "border-red-500" : ""
                    }
                  />
                  {validationErrors.end_date && (
                    <p className="text-sm text-red-600">
                      {validationErrors.end_date}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="end_time" className="text-sm font-medium">
                    End Time
                  </label>
                  <Input
                    id="end_time"
                    type="time"
                    value={event.end_time}
                    onChange={(e) =>
                      handleInputChange("end_time", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="location_name"
                    className="text-sm font-medium"
                  >
                    Venue Name *
                  </label>
                  <Input
                    id="location_name"
                    type="text"
                    value={event.location_name}
                    onChange={(e) =>
                      handleInputChange("location_name", e.target.value)
                    }
                    placeholder="Enter venue name"
                    required
                    className={
                      validationErrors.location_name ? "border-red-500" : ""
                    }
                  />
                  {validationErrors.location_name && (
                    <p className="text-sm text-red-600">
                      {validationErrors.location_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="capacity" className="text-sm font-medium">
                    Capacity
                  </label>
                  <Input
                    id="capacity"
                    type="number"
                    value={event.capacity}
                    onChange={(e) =>
                      handleInputChange(
                        "capacity",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="Maximum attendees"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="location_address"
                  className="text-sm font-medium"
                >
                  Venue Address *
                </label>
                <Input
                  id="location_address"
                  type="text"
                  value={event.location_address}
                  onChange={(e) =>
                    handleInputChange("location_address", e.target.value)
                  }
                  placeholder="Enter venue address"
                  required
                  className={
                    validationErrors.location_address ? "border-red-500" : ""
                  }
                />
                {validationErrors.location_address && (
                  <p className="text-sm text-red-600">
                    {validationErrors.location_address}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="featured"
                  type="checkbox"
                  checked={event.featured}
                  onChange={(e) =>
                    handleInputChange("featured", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="featured" className="text-sm font-medium">
                  Featured Event
                </label>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="status"
                  value={event.status}
                  onChange={(e) =>
                    handleInputChange(
                      "status",
                      e.target.value as "draft" | "published" | "cancelled"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Ticket Types Section */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Ticket Types</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTicketType}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Ticket Type
                  </Button>
                </div>

                {ticketTypes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No ticket types added yet. Add ticket types to enable
                    bookings.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ticketTypes.map((ticket, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium">
                              {ticket.id
                                ? `Ticket Type ${index + 1} (Existing)`
                                : `Ticket Type ${index + 1} (New)`}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTicketType(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Ticket Name *
                              </label>
                              <Input
                                type="text"
                                value={ticket.name}
                                onChange={(e) =>
                                  updateTicketType(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., General Admission"
                                required
                                className={
                                  validationErrors[`ticket_${index}_name`]
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                              {validationErrors[`ticket_${index}_name`] && (
                                <p className="text-sm text-red-600">
                                  {validationErrors[`ticket_${index}_name`]}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Price ($) *
                              </label>
                              <Input
                                type="number"
                                value={ticket.price}
                                onChange={(e) =>
                                  updateTicketType(
                                    index,
                                    "price",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                                className={
                                  validationErrors[`ticket_${index}_price`]
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                              {validationErrors[`ticket_${index}_price`] && (
                                <p className="text-sm text-red-600">
                                  {validationErrors[`ticket_${index}_price`]}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Quantity Available *
                              </label>
                              <Input
                                type="number"
                                value={ticket.quantity_available}
                                onChange={(e) =>
                                  updateTicketType(
                                    index,
                                    "quantity_available",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                placeholder="100"
                                min="1"
                                required
                                className={
                                  validationErrors[`ticket_${index}_quantity`]
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                              {validationErrors[`ticket_${index}_quantity`] && (
                                <p className="text-sm text-red-600">
                                  {validationErrors[`ticket_${index}_quantity`]}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Max Per Order
                              </label>
                              <Input
                                type="number"
                                value={ticket.max_per_order}
                                onChange={(e) =>
                                  updateTicketType(
                                    index,
                                    "max_per_order",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                placeholder="10"
                                min="1"
                              />
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <label className="text-sm font-medium">
                              Description
                            </label>
                            <textarea
                              value={ticket.description}
                              onChange={(e) =>
                                updateTicketType(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Describe this ticket type..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Link href="/dashboard/events">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
