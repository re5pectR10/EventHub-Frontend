"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react";
import { apiService } from "@/lib/api";
import type { TicketType, Event } from "@/lib/types";

export default function TicketManagementPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    quantity_available: 100,
    max_per_order: 10,
    sale_start_date: "",
    sale_end_date: "",
    is_active: true,
  });

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/signin");
          return;
        }

        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;

        // Load event details using organizer-specific API service (includes ticket types)
        const eventResponse = await apiService.getOrganizerEvent(eventId);

        if (eventResponse.error) {
          throw new Error(eventResponse.error);
        }

        const eventData = eventResponse.data || eventResponse.event;
        if (eventData) {
          setEvent(eventData);
          // Extract ticket types from event data (no separate API call needed)
          setTicketTypes(eventData.ticket_types || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        showNotification("error", "Failed to load event data");
        router.push("/dashboard/events");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;

      if (editingTicket) {
        // Update existing ticket type
        response = await apiService.updateTicketType(
          editingTicket.id,
          formData
        );

        if (response.error) {
          throw new Error(response.error);
        }

        const ticketData = response.data;
        if (ticketData) {
          setTicketTypes((prev) =>
            prev.map((ticket) =>
              ticket.id === editingTicket.id ? ticketData : ticket
            )
          );
          showNotification(
            "success",
            `Ticket type "${ticketData.name}" updated successfully`
          );
        }
      } else {
        // Create new ticket type
        response = await apiService.createTicketType({
          ...formData,
          event_id: eventId,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        const ticketData = response.data;
        if (ticketData) {
          setTicketTypes((prev) => [...prev, ticketData]);
          showNotification(
            "success",
            `Ticket type "${ticketData.name}" created successfully`
          );
        }
      }

      resetForm();
    } catch (error) {
      console.error("Error saving ticket type:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save ticket type";
      showNotification("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setFormData({
      name: ticket.name,
      description: ticket.description || "",
      price: ticket.price,
      quantity_available: ticket.quantity_available,
      max_per_order: ticket.max_per_order || 10,
      sale_start_date: ticket.sale_start_date || "",
      sale_end_date: ticket.sale_end_date || "",
      is_active: ticket.is_active ?? true,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (ticketId: string, ticketName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the ticket type "${ticketName}"?`
      )
    ) {
      return;
    }

    try {
      const response = await apiService.deleteTicketType(ticketId);

      if (response.error) {
        throw new Error(response.error);
      }

      setTicketTypes((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      showNotification(
        "success",
        `Ticket type "${ticketName}" deleted successfully`
      );
    } catch (error) {
      console.error("Error deleting ticket type:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete ticket type";
      showNotification("error", errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      quantity_available: 100,
      max_per_order: 10,
      sale_start_date: "",
      sale_end_date: "",
      is_active: true,
    });
    setEditingTicket(null);
    setShowCreateForm(false);
  };

  const getTotalRevenue = () => {
    return ticketTypes.reduce(
      (total, ticket) => total + ticket.price * ticket.quantity_sold,
      0
    );
  };

  const getTotalSold = () => {
    return ticketTypes.reduce(
      (total, ticket) => total + ticket.quantity_sold,
      0
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading ticket management...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div
            className={`p-4 rounded-lg shadow-lg border-l-4 ${
              notification.type === "success"
                ? "bg-green-50 border-green-400 text-green-800"
                : "bg-red-50 border-red-400 text-red-800"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {notification.type === "success" ? (
                  <CheckIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <XIcon className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setNotification(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/events")}
            className="mb-4"
          >
            ← Back to Events
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Ticket Management
              </h1>
              <p className="mt-2 text-gray-600">{event.title}</p>
              <p className="text-sm text-gray-500">
                Event Date: {new Date(event.start_date).toLocaleDateString()}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
              disabled={isSubmitting}
            >
              <PlusIcon className="h-4 w-4" />
              Add Ticket Type
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">
                {ticketTypes.length}
              </div>
              <div className="text-sm text-gray-500">Ticket Types</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {getTotalSold()}
              </div>
              <div className="text-sm text-gray-500">Tickets Sold</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">
                ${getTotalRevenue().toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Revenue</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ticket Types List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Current Ticket Types
            </h2>
            {ticketTypes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No ticket types created yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowCreateForm(true)}
                    disabled={isSubmitting}
                  >
                    Create Your First Ticket Type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              ticketTypes.map((ticket) => (
                <Card key={ticket.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{ticket.name}</CardTitle>
                        <CardDescription>{ticket.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ticket)}
                          disabled={isSubmitting}
                          title="Edit ticket type"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(ticket.id, ticket.name)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-700"
                          title="Delete ticket type"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Price</p>
                        <p className="font-medium">
                          ${ticket.price.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Available</p>
                        <p className="font-medium">
                          {ticket.quantity_available - ticket.quantity_sold}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sold</p>
                        <p className="font-medium">{ticket.quantity_sold}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max per order</p>
                        <p className="font-medium">{ticket.max_per_order}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.is_active
                            ? "text-green-600 bg-green-100"
                            : "text-gray-600 bg-gray-100"
                        }`}
                      >
                        {ticket.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingTicket
                      ? "Edit Ticket Type"
                      : "Create New Ticket Type"}
                  </CardTitle>
                  <CardDescription>
                    Configure the ticket details and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g., General Admission"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe what this ticket includes..."
                        rows={3}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Price ($) *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              price: parseFloat(e.target.value) || 0,
                            }))
                          }
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Quantity Available *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.quantity_available}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              quantity_available: parseInt(e.target.value) || 1,
                            }))
                          }
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Max per order
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.max_per_order}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            max_per_order: parseInt(e.target.value) || 1,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Sale Start Date
                        </label>
                        <Input
                          type="datetime-local"
                          value={formData.sale_start_date}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              sale_start_date: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Sale End Date
                        </label>
                        <Input
                          type="datetime-local"
                          value={formData.sale_end_date}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              sale_end_date: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_active: e.target.checked,
                          }))
                        }
                        disabled={isSubmitting}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor="is_active"
                        className="text-sm font-medium"
                      >
                        Active (available for purchase)
                      </label>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {editingTicket ? "Updating..." : "Creating..."}
                          </div>
                        ) : editingTicket ? (
                          "Update Ticket Type"
                        ) : (
                          "Create Ticket Type"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
