"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  CreditCard,
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  Loader2,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "@/lib/notifications";
import type { Booking } from "@/lib/types";

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = params.id as string;

  // Fetch booking details
  const {
    data: booking,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const response = await apiService.getBooking(bookingId);
      if (response.error) {
        throw new Error(response.error);
      }
      if (!response.booking) {
        throw new Error("Booking not found");
      }
      return response.booking;
    },
    enabled: !!bookingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiService.cancelBooking(bookingId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.booking;
    },
    onSuccess: (updatedBooking) => {
      // Update the booking in cache
      queryClient.setQueryData(["booking", bookingId], updatedBooking);
      // Invalidate user bookings list
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      toast.success("Booking cancelled successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel booking"
      );
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDateTime = (date: string, time?: string) => {
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (time) {
      const timeStr = new Date(`2000-01-01T${time}`).toLocaleTimeString(
        "en-US",
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
      );
      return `${dateStr} at ${timeStr}`;
    }

    return dateStr;
  };

  const handleDownloadTickets = () => {
    toast.info("Download tickets functionality coming soon!");
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking? This action cannot be undone."
    );

    if (!confirmed) return;

    cancelBookingMutation.mutate(booking.id);
  };

  const handleRetry = () => {
    refetch();
    toast.success("Refreshing booking details...");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? "Failed to Load Booking" : "Booking Not Found"}
          </h1>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "The booking you're looking for doesn't exist."}
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => router.push("/my-bookings")}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Bookings
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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            onClick={() => router.push("/my-bookings")}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Bookings
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {booking.events?.title}
                  </CardTitle>
                  {getStatusBadge(booking.status)}
                </div>
                <CardDescription>Booking ID: {booking.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {booking.events?.start_date && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span>
                          {formatDateTime(
                            booking.events.start_date,
                            booking.events.start_time
                          )}
                        </span>
                      </div>
                    )}

                    {booking.events?.location_name && (
                      <div className="flex items-start text-gray-600">
                        <MapPin className="h-4 w-4 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p>{booking.events.location_name}</p>
                          {booking.events.location_address && (
                            <p className="text-sm text-gray-500">
                              {booking.events.location_address}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span>{booking.customer_name}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-3 flex-shrink-0" />
                  <a
                    href={`mailto:${booking.customer_email}`}
                    className="hover:text-blue-600"
                  >
                    {booking.customer_email}
                  </a>
                </div>

                {booking.customer_phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-3 flex-shrink-0" />
                    <a
                      href={`tel:${booking.customer_phone}`}
                      className="hover:text-blue-600"
                    >
                      {booking.customer_phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tickets */}
            {booking.booking_items && booking.booking_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {booking.booking_items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {item.ticket_types?.name}
                          </h4>
                          {item.ticket_types?.description && (
                            <p className="text-sm text-gray-600">
                              {item.ticket_types.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: {formatCurrency(item.total_price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(booking.total_price)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Platform fee</span>
                  <span>{formatCurrency(booking.total_price * 0.05)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-medium">
                    <span>Total Paid</span>
                    <span>{formatCurrency(booking.total_price * 1.05)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.status === "confirmed" && (
                  <>
                    <Button className="w-full" onClick={handleDownloadTickets}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Tickets
                    </Button>
                    <Button variant="outline" className="w-full">
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR Code
                    </Button>
                  </>
                )}

                {booking.status !== "cancelled" && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancelBooking}
                    disabled={cancelBookingMutation.isPending}
                  >
                    {cancelBookingMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Booking Information */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <p className="text-gray-600">
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <p className="text-gray-600 mt-1">
                    {getStatusBadge(booking.status)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
