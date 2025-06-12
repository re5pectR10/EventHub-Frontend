"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  CreditCard,
  Shield,
  ArrowLeft,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { apiService } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";
import { edgeFunctionsService } from "@/lib/edge-functions";
import type { Event } from "@/lib/api";

interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
  price: number;
  name: string;
}

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialRequests?: string;
  general?: string;
}

export default function BookEventPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>(
    []
  );
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await apiService.getEvent(params.slug as string);
        if (response.data) {
          setEvent(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setLoading(false);
      }
    };

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setFormData((prev) => ({
          ...prev,
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          email: user.email || "",
        }));
      }
    };

    fetchEvent();
    getUser();
  }, [params.slug, supabase.auth]);

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    const ticketType = event?.ticket_types.find((t) => t.id === ticketTypeId);
    if (!ticketType) return;

    setTicketSelections((prev) => {
      const existing = prev.find((t) => t.ticketTypeId === ticketTypeId);
      if (quantity === 0) {
        return prev.filter((t) => t.ticketTypeId !== ticketTypeId);
      }

      const newSelection: TicketSelection = {
        ticketTypeId,
        quantity,
        price: ticketType.price,
        name: ticketType.name,
      };

      if (existing) {
        return prev.map((t) =>
          t.ticketTypeId === ticketTypeId ? newSelection : t
        );
      } else {
        return [...prev, newSelection];
      }
    });
  };

  const getTicketQuantity = (ticketTypeId: string): number => {
    return (
      ticketSelections.find((t) => t.ticketTypeId === ticketTypeId)?.quantity ||
      0
    );
  };

  const getTotalPrice = (): number => {
    return ticketSelections.reduce(
      (total, ticket) => total + ticket.price * ticket.quantity,
      0
    );
  };

  const getTotalTickets = (): number => {
    return ticketSelections.reduce(
      (total, ticket) => total + ticket.quantity,
      0
    );
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (ticketSelections.length === 0) {
      newErrors.general = "Please select at least one ticket";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      router.push(
        `/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // Prepare booking data for Edge Function
      const bookingData = {
        eventId: event?.id || "",
        tickets: ticketSelections.map((selection) => ({
          type: selection.name,
          quantity: selection.quantity,
          price: selection.price,
        })),
        attendees: [
          {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
          },
        ],
        specialRequests: formData.specialRequests,
      };

      // Use Edge Function to process the booking
      const result = await edgeFunctionsService.completeBooking(
        bookingData,
        event?.title || "Event",
        event?.start_date || new Date().toISOString()
      );

      console.log("Booking completed:", result);
      setBookingComplete(true);
    } catch (error: any) {
      console.error("Booking error:", error);
      setErrors({
        general:
          error.message || "Failed to complete booking. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange =
    (field: keyof BookingFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="h-8 bg-gray-200 animate-pulse rounded w-64 mb-8" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="h-6 bg-gray-200 animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card>
                    <CardHeader>
                      <div className="h-6 bg-gray-200 animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Event Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              The event you're looking for doesn't exist.
            </p>
            <Button onClick={() => router.push("/events")}>
              Browse Events
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 mb-6">
              Your booking for <strong>{event.title}</strong> has been
              confirmed. You'll receive a confirmation email shortly.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push("/events")} className="w-full">
                Browse More Events
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Button>

            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Book Tickets for {event.title}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Event Details & Ticket Selection */}
              <div className="space-y-6">
                {/* Event Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-5 h-5 mr-3" />
                      <div>
                        <div className="font-medium">
                          {new Date(event.start_date).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </div>
                        <div className="text-sm">
                          {new Date(event.start_date).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                          {event.end_date &&
                            ` - ${new Date(event.end_date).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-3" />
                      <div>
                        <div className="font-medium">{event.location_name}</div>
                        <div className="text-sm">{event.location_address}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Users className="w-5 h-5 mr-3" />
                      <span>Organized by {event.organizers.business_name}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.ticket_types.map((ticketType) => {
                      const quantity = getTicketQuantity(ticketType.id);
                      const available =
                        ticketType.quantity_available -
                        ticketType.quantity_sold;

                      return (
                        <div
                          key={ticketType.id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">
                                {ticketType.name}
                              </h4>
                              {ticketType.description && (
                                <p className="text-sm text-gray-600">
                                  {ticketType.description}
                                </p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                {available} tickets available
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                ${ticketType.price.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateTicketQuantity(
                                    ticketType.id,
                                    Math.max(0, quantity - 1)
                                  )
                                }
                                disabled={quantity === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateTicketQuantity(
                                    ticketType.id,
                                    quantity + 1
                                  )
                                }
                                disabled={quantity >= available}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            {quantity > 0 && (
                              <div className="text-right">
                                <div className="font-semibold">
                                  ${(ticketType.price * quantity).toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Booking Form & Summary */}
              <div className="space-y-6">
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ticketSelections.length === 0 ? (
                      <p className="text-gray-500">No tickets selected</p>
                    ) : (
                      <div className="space-y-3">
                        {ticketSelections.map((ticket) => (
                          <div
                            key={ticket.ticketTypeId}
                            className="flex justify-between"
                          >
                            <span>
                              {ticket.name} × {ticket.quantity}
                            </span>
                            <span>
                              ${(ticket.price * ticket.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t pt-3">
                          <div className="flex justify-between font-bold text-lg">
                            <span>
                              Total ({getTotalTickets()} ticket
                              {getTotalTickets() !== 1 ? "s" : ""})
                            </span>
                            <span>${getTotalPrice().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Booking Form */}
                {ticketSelections.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendee Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form onSubmit={handleSubmit}>
                        {errors.general && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <FormMessage>{errors.general}</FormMessage>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <FormField>
                            <FormLabel htmlFor="firstName">
                              First Name
                            </FormLabel>
                            <Input
                              id="firstName"
                              type="text"
                              value={formData.firstName}
                              onChange={handleInputChange("firstName")}
                              className={
                                errors.firstName ? "border-red-500" : ""
                              }
                              disabled={submitting}
                            />
                            {errors.firstName && (
                              <FormMessage>{errors.firstName}</FormMessage>
                            )}
                          </FormField>

                          <FormField>
                            <FormLabel htmlFor="lastName">Last Name</FormLabel>
                            <Input
                              id="lastName"
                              type="text"
                              value={formData.lastName}
                              onChange={handleInputChange("lastName")}
                              className={
                                errors.lastName ? "border-red-500" : ""
                              }
                              disabled={submitting}
                            />
                            {errors.lastName && (
                              <FormMessage>{errors.lastName}</FormMessage>
                            )}
                          </FormField>
                        </div>

                        <FormField>
                          <FormLabel htmlFor="email">Email Address</FormLabel>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange("email")}
                            className={errors.email ? "border-red-500" : ""}
                            disabled={submitting}
                          />
                          {errors.email && (
                            <FormMessage>{errors.email}</FormMessage>
                          )}
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="phone">Phone Number</FormLabel>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange("phone")}
                            className={errors.phone ? "border-red-500" : ""}
                            disabled={submitting}
                          />
                          {errors.phone && (
                            <FormMessage>{errors.phone}</FormMessage>
                          )}
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="specialRequests">
                            Special Requests (Optional)
                          </FormLabel>
                          <textarea
                            id="specialRequests"
                            rows={3}
                            value={formData.specialRequests}
                            onChange={handleInputChange("specialRequests")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Any special requirements or requests..."
                            disabled={submitting}
                          />
                        </FormField>

                        {!user && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <div className="flex items-center">
                              <Shield className="w-5 h-5 text-blue-600 mr-2" />
                              <span className="text-sm text-blue-800">
                                You'll need to sign in to complete your booking
                              </span>
                            </div>
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting || ticketSelections.length === 0}
                        >
                          {submitting ? (
                            "Processing..."
                          ) : user ? (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Complete Booking - ${getTotalPrice().toFixed(2)}
                            </>
                          ) : (
                            "Sign In to Book"
                          )}
                        </Button>
                      </Form>
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
