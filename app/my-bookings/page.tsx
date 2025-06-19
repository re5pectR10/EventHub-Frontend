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
import { apiService } from "@/lib/api";

interface UserBooking {
  id: string;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  events: {
    title: string;
    start_date: string;
    start_time: string;
    location_name: string;
    location_address: string;
  };
  booking_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    ticket_types: {
      name: string;
    };
  }>;
  tickets: Array<{
    id: string;
    ticket_code: string;
    qr_code: string;
    status: "active" | "used" | "cancelled";
  }>;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadUserBookings() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/signin");
          return;
        }

        setUser(user);

        const response = await apiService.getBookings();

        if (response.error) {
          setError(response.error);
        } else {
          // Map bookings to UserBooking format
          const userBookings = (response.bookings || []).map(
            (booking: any) => ({
              ...booking,
              events: {
                ...booking.events,
                location_address: booking.events?.location_address || "",
              },
            })
          );
          setBookings(userBookings);
        }
      } catch (error) {
        console.error("Error loading bookings:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load bookings. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadUserBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getEventStatus = (startDate: string) => {
    const eventDate = new Date(startDate);
    const now = new Date();

    if (eventDate < now) {
      return { text: "Past Event", color: "text-gray-600 bg-gray-100" };
    } else if (eventDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return { text: "Tomorrow", color: "text-orange-600 bg-orange-100" };
    } else {
      return { text: "Upcoming", color: "text-blue-600 bg-blue-100" };
    }
  };

  const getTotalSpent = () => {
    return bookings
      .filter((booking) => booking.status === "confirmed")
      .reduce((total, booking) => total + booking.total_price, 0);
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return bookings.filter(
      (booking) =>
        booking.status === "confirmed" &&
        new Date(booking.events.start_date) > now
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-600">
            View and manage your event tickets
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">
                {bookings.length}
              </div>
              <div className="text-sm text-gray-500">Total Bookings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {getUpcomingEvents()}
              </div>
              <div className="text-sm text-gray-500">Upcoming Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">
                ${getTotalSpent().toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Spent</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No bookings yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start booking events to see them here
              </p>
              <Link href="/events">
                <Button>Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const eventStatus = getEventStatus(booking.events.start_date);

              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">
                            {booking.events.title}
                          </CardTitle>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status.charAt(0).toUpperCase() +
                              booking.status.slice(1)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${eventStatus.color}`}
                          >
                            {eventStatus.text}
                          </span>
                        </div>
                        <CardDescription>
                          Booking ID: {booking.id}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${booking.total_price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.tickets.length} ticket
                          {booking.tickets.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Event Date
                        </p>
                        <p className="text-gray-900">
                          {new Date(
                            booking.events.start_date
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-gray-900">
                          {booking.events.start_time}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Location
                        </p>
                        <p className="text-gray-900">
                          {booking.events.location_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {booking.events.location_address}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Tickets
                        </p>
                        {booking.booking_items.map((item, index) => (
                          <p key={index} className="text-gray-900">
                            {item.quantity}x {item.ticket_types.name}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Booking Date
                        </p>
                        <p className="text-gray-900">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Tickets Section */}
                    {booking.status === "confirmed" &&
                      booking.tickets.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Your Tickets
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {booking.tickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="border rounded-lg p-4 bg-white"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">
                                    #{ticket.ticket_code}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                      ticket.status
                                    )}`}
                                  >
                                    {ticket.status}
                                  </span>
                                </div>
                                {ticket.qr_code && (
                                  <div className="flex justify-center">
                                    <img
                                      src={ticket.qr_code}
                                      alt={`QR Code for ticket ${ticket.ticket_code}`}
                                      className="w-24 h-24 object-contain"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 text-center mt-2">
                                  Show this QR code at the event
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Actions */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex gap-3">
                        <Link href={`/my-bookings/${booking.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        {booking.status === "confirmed" &&
                          booking.tickets.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Download tickets functionality would go here
                                alert(
                                  "Download tickets feature would be implemented here"
                                );
                              }}
                            >
                              Download Tickets
                            </Button>
                          )}
                        {booking.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => {
                              // Cancel booking functionality would go here
                              if (
                                confirm(
                                  "Are you sure you want to cancel this booking?"
                                )
                              ) {
                                alert(
                                  "Cancel booking feature would be implemented here"
                                );
                              }
                            }}
                          >
                            Cancel Booking
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
