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
import type { BookingDetails } from "@/lib/types";

export default function BookingDetailsPage() {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  useEffect(() => {
    async function loadBooking() {
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

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bookings/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Booking not found");
        }

        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        console.error("Error loading booking:", error);
        router.push("/dashboard/bookings");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  const updateBookingStatus = async (newStatus: "confirmed" | "cancelled") => {
    if (!booking) return;

    setUpdating(true);
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bookings/${bookingId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update booking");
      }

      const data = await response.json();
      setBooking(data.booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      case "active":
        return "text-green-600 bg-green-100";
      case "used":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Booking not found
          </h1>
          <p className="mt-2 text-gray-600">
            The booking you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/dashboard/bookings")}
          >
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/bookings")}
            className="mb-4"
          >
            ← Back to Bookings
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
          <p className="mt-2 text-gray-600">Booking ID: {booking.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Booking Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>
                      Contact details and booking info
                    </CardDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    {booking.status.charAt(0).toUpperCase() +
                      booking.status.slice(1)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-lg font-medium text-gray-900">
                      {booking.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900">{booking.customer_email}</p>
                  </div>
                  {booking.customer_phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-gray-900">{booking.customer_phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Amount
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${booking.total_price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Booking Date
                      </p>
                      <p className="text-gray-900">
                        {new Date(booking.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Last Updated
                      </p>
                      <p className="text-gray-900">
                        {new Date(booking.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
                <CardDescription>
                  Details about the booked event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Event Title
                  </p>
                  <p className="text-xl font-medium text-gray-900">
                    {booking.events.title}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Start Date & Time
                    </p>
                    <p className="text-gray-900">
                      {new Date(booking.events.start_date).toLocaleDateString()}{" "}
                      at {booking.events.start_time}
                    </p>
                  </div>
                  {booking.events.end_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        End Date & Time
                      </p>
                      <p className="text-gray-900">
                        {new Date(booking.events.end_date).toLocaleDateString()}{" "}
                        at {booking.events.end_time}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-gray-900">
                    {booking.events.location_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.events.location_address}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Details</CardTitle>
                <CardDescription>Purchased tickets breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {booking.booking_items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.ticket_types.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.ticket_types.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${item.total_price.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${item.unit_price.toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {booking.status === "pending" && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Manage this booking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => updateBookingStatus("confirmed")}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating ? "Updating..." : "Confirm Booking"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateBookingStatus("cancelled")}
                    disabled={updating}
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  >
                    {updating ? "Updating..." : "Cancel Booking"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Tickets</CardTitle>
                <CardDescription>QR codes and ticket status</CardDescription>
              </CardHeader>
              <CardContent>
                {booking.tickets.length > 0 ? (
                  <div className="space-y-3">
                    {booking.tickets.map((ticket) => (
                      <div key={ticket.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              #{ticket.ticket_code}
                            </p>
                            {ticket.scanned_at && (
                              <p className="text-sm text-gray-500">
                                Scanned:{" "}
                                {new Date(ticket.scanned_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                        {ticket.qr_code && (
                          <div className="mt-2">
                            <img
                              src={ticket.qr_code}
                              alt={`QR Code for ticket ${ticket.ticket_code}`}
                              className="w-20 h-20 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No tickets generated yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
