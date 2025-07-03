"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";
import type { Event, TicketSelection } from "@/lib/types";
import { Calendar, Clock, CreditCard, MapPin, Minus, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BookEventPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>(
    []
  );
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await apiService.getEventBySlug(slug);

        if (response.error) {
          setError(response.error);
          return;
        }

        const eventData = response.data || response.event;
        if (eventData) {
          // Event data already includes ticket types from the API
          setEvent({
            ...eventData,
            ticket_types: eventData.ticket_types || [],
          });
        }
      } catch (error) {
        console.error("Error loading event:", error);
        setError("Failed to load event details");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadEvent();
    }
  }, [slug]);

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    setTicketSelections((prev) => {
      const existing = prev.find((ts) => ts.ticket_type_id === ticketTypeId);

      if (quantity === 0) {
        return prev.filter((ts) => ts.ticket_type_id !== ticketTypeId);
      }

      if (existing) {
        return prev.map((ts) =>
          ts.ticket_type_id === ticketTypeId ? { ...ts, quantity } : ts
        );
      }

      return [...prev, { ticket_type_id: ticketTypeId, quantity }];
    });
  };

  const getTicketQuantity = (ticketTypeId: string): number => {
    const selection = ticketSelections.find(
      (ts) => ts.ticket_type_id === ticketTypeId
    );
    return selection?.quantity || 0;
  };

  const getTotalPrice = (): number => {
    if (!event) return 0;

    return ticketSelections.reduce((total, selection) => {
      const ticketType = event.ticket_types.find(
        (tt) => tt.id === selection.ticket_type_id
      );
      return total + (ticketType?.price || 0) * selection.quantity;
    }, 0);
  };

  const getTotalTickets = (): number => {
    return ticketSelections.reduce(
      (total, selection) => total + selection.quantity,
      0
    );
  };

  const handleCheckout = async () => {
    if (!event || ticketSelections.length === 0) {
      setError("Please select at least one ticket");
      return;
    }

    if (!customerEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!customerName) {
      setError("Please enter your name");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await apiService.createBooking({
        event_id: event.id,
        items: ticketSelections,
        customer_name: customerName,
        customer_email: customerEmail,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.checkout_url;
      } else if (response?.booking?.id) {
        // Booking created but checkout failed, redirect to checkout page for retry
        router.push(`/checkout/${response.booking.id}`);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create checkout session. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: string, time: string) => {
    const dateTime = new Date(`${date}T${time}`);
    return dateTime.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Found
          </h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button onClick={() => router.push("/events")}>Browse Events</Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${slug}`)}
            className="mb-4"
          >
            ← Back to Event
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book Tickets
          </h1>
          <h2 className="text-xl text-gray-600">{event.title}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(event.start_date, event.start_time)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatTime(event.start_time)} -{" "}
                    {formatTime(event.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location_name}</span>
                </div>
                {event.location_address && (
                  <p className="text-sm text-gray-500 ml-6">
                    {event.location_address}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Ticket Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Tickets</CardTitle>
                <CardDescription>
                  Choose the number of tickets you&apos;d like to purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.ticket_types && event.ticket_types.length > 0 ? (
                  <div className="space-y-4">
                    {event.ticket_types.map((ticketType) => {
                      const availableQuantity =
                        ticketType.quantity_available -
                        ticketType.quantity_sold;
                      const selectedQuantity = getTicketQuantity(ticketType.id);
                      const maxQuantity = Math.min(
                        availableQuantity,
                        ticketType.max_per_order || 10
                      );

                      return (
                        <div
                          key={ticketType.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium">{ticketType.name}</h3>
                            {ticketType.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {ticketType.description}
                              </p>
                            )}
                            <p className="text-lg font-semibold text-green-600 mt-2">
                              ${ticketType.price.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {availableQuantity} available
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateTicketQuantity(
                                  ticketType.id,
                                  Math.max(0, selectedQuantity - 1)
                                )
                              }
                              disabled={selectedQuantity === 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>

                            <span className="w-8 text-center font-medium">
                              {selectedQuantity}
                            </span>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateTicketQuantity(
                                  ticketType.id,
                                  selectedQuantity + 1
                                )
                              }
                              disabled={
                                selectedQuantity >= maxQuantity ||
                                availableQuantity === 0
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      No tickets available for this event.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketSelections.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {ticketSelections.map((selection) => {
                        const ticketType = event.ticket_types.find(
                          (tt) => tt.id === selection.ticket_type_id
                        );
                        if (!ticketType) return null;

                        return (
                          <div
                            key={selection.ticket_type_id}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {selection.quantity}x {ticketType.name}
                            </span>
                            <span>
                              $
                              {(ticketType.price * selection.quantity).toFixed(
                                2
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t pt-2">
                      <div className="flex justify-between font-medium">
                        <span>Subtotal ({getTotalTickets()} tickets)</span>
                        <span>${getTotalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>Platform fee (5%)</span>
                        <span>${(getTotalPrice() * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                        <span>Total</span>
                        <span>${(getTotalPrice() * 1.05).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleCheckout}
                      disabled={processing || !customerEmail || !customerName}
                      className="w-full flex items-center gap-2"
                    >
                      {processing ? (
                        "Processing..."
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      Secure payment powered by Stripe
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      Select tickets to see pricing
                    </p>
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
