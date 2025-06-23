"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useTicketsByEvent,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";

interface TicketFormData {
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  sale_start_date: string;
  sale_end_date: string;
  max_per_order: number;
}

export default function TicketManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [formData, setFormData] = useState<TicketFormData>({
    name: "",
    description: "",
    price: 0,
    quantity_available: 100,
    sale_start_date: "",
    sale_end_date: "",
    max_per_order: 10,
  });

  // React Query hooks
  const {
    data: tickets = [],
    isLoading: loadingTickets,
    error: ticketsError,
    refetch: refetchTickets,
  } = useTicketsByEvent(eventId);

  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();
  const deleteTicketMutation = useDeleteTicket();

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      quantity_available: 100,
      sale_start_date: "",
      sale_end_date: "",
      max_per_order: 10,
    });
    setEditingTicket(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTicket) {
        // Update existing ticket
        await updateTicketMutation.mutateAsync({
          id: editingTicket.id,
          ticketData: {
            ...formData,
            event_id: eventId,
          },
        });
        alert("Ticket updated successfully!");
      } else {
        // Create new ticket
        await createTicketMutation.mutateAsync({
          ...formData,
          event_id: eventId,
        });
        alert("Ticket created successfully!");
      }

      resetForm();
      await refetchTickets();
    } catch (error: any) {
      alert(error.message || "Failed to save ticket");
    }
  };

  const handleEdit = (ticket: any) => {
    setEditingTicket(ticket);
    setFormData({
      name: ticket.name,
      description: ticket.description || "",
      price: ticket.price,
      quantity_available: ticket.quantity_available,
      sale_start_date: ticket.sale_start_date || "",
      sale_end_date: ticket.sale_end_date || "",
      max_per_order: ticket.max_per_order || 10,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket type?")) {
      return;
    }

    try {
      await deleteTicketMutation.mutateAsync({
        id: ticketId,
        eventId,
      });
      alert("Ticket deleted successfully!");
      await refetchTickets();
    } catch (error: any) {
      alert(error.message || "Failed to delete ticket");
    }
  };

  const isSubmitting =
    createTicketMutation.isPending || updateTicketMutation.isPending;

  const isDeleting = deleteTicketMutation.isPending;

  if (loadingTickets) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (ticketsError) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <p className="text-red-600">
              Error loading tickets: {ticketsError.message}
            </p>
            <Button onClick={() => refetchTickets()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/events/${eventId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Ticket Management
              </h1>
              <p className="text-gray-600">
                Manage ticket types for this event
              </p>
            </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Ticket Type
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ticket Form */}
          {isFormOpen && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingTicket ? "Edit Ticket Type" : "Create Ticket Type"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Ticket Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., General Admission"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Ticket description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: parseFloat(e.target.value),
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="quantity">Available Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity_available}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity_available: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxPerOrder">Max Per Order</Label>
                      <Input
                        id="maxPerOrder"
                        type="number"
                        min="1"
                        value={formData.max_per_order}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_per_order: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="saleStart">Sale Start Date</Label>
                      <Input
                        id="saleStart"
                        type="datetime-local"
                        value={formData.sale_start_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sale_start_date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="saleEnd">Sale End Date</Label>
                      <Input
                        id="saleEnd"
                        type="datetime-local"
                        value={formData.sale_end_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sale_end_date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting
                          ? editingTicket
                            ? "Updating..."
                            : "Creating..."
                          : editingTicket
                          ? "Update Ticket"
                          : "Create Ticket"}
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

          {/* Tickets List */}
          <div className={isFormOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Plus className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No ticket types yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first ticket type to start selling tickets.
                  </p>
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ticket Type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            {ticket.name}
                          </CardTitle>
                          {ticket.description && (
                            <p className="text-gray-600 mt-1">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            ${ticket.price.toFixed(2)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(ticket)}
                            disabled={isSubmitting || isDeleting}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(ticket.id)}
                            disabled={isSubmitting || isDeleting}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            Available:
                          </span>
                          <p>
                            {ticket.quantity_available - ticket.quantity_sold}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Sold:
                          </span>
                          <p>{ticket.quantity_sold}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Max Per Order:
                          </span>
                          <p>{ticket.max_per_order || "No limit"}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Revenue:
                          </span>
                          <p>
                            ${(ticket.price * ticket.quantity_sold).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {(ticket.sale_start_date || ticket.sale_end_date) && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {ticket.sale_start_date && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Sale Starts:
                                </span>
                                <p>
                                  {new Date(
                                    ticket.sale_start_date
                                  ).toLocaleString()}
                                </p>
                              </div>
                            )}
                            {ticket.sale_end_date && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Sale Ends:
                                </span>
                                <p>
                                  {new Date(
                                    ticket.sale_end_date
                                  ).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
