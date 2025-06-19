"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { apiService } from "@/lib/api";
import type { Booking } from "@/lib/types";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;

  // Check if this is a success callback from Stripe
  const sessionId = searchParams.get("session_id");
  const isSuccess = searchParams.get("success") === "true";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      try {
        const response = await apiService.getBooking(bookingId);
        if (response.error) {
          setError(response.error);
          return;
        }
        const bookingData = response.booking || response.data;
        if (bookingData) {
          setBooking(bookingData);

          // Check if payment is already confirmed
          if (bookingData.status === "confirmed") {
            setPaymentSuccess(true);
          }
        } else {
          setError("Booking not found");
        }
      } catch (error) {
        console.error("Error loading booking:", error);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    }

    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  // Handle success callback from Stripe
  useEffect(() => {
    if (isSuccess && sessionId && booking) {
      setPaymentSuccess(true);
      // Optionally refresh booking data to get updated status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isSuccess, sessionId, booking]);

  const handlePayWithStripe = async () => {
    if (!booking) return;

    setProcessing(true);
    setError(null);

    try {
      // Prepare tickets data for Stripe checkout
      const tickets =
        booking.booking_items?.map((item) => ({
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
        })) || [];

      // Create Stripe checkout session
      const response = await apiService.createStripeCheckoutSession({
        event_id: booking.event_id,
        tickets,
        customer_email: booking.customer_email,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create checkout session"
      );
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
          <p className="mt-4">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Checkout Error
          </h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button onClick={() => router.push("/events")}>Browse Events</Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  // Show success state if payment is completed
  if (paymentSuccess || booking.status === "confirmed") {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600">Your booking has been confirmed</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Booking Confirmed
              </CardTitle>
              <CardDescription>Booking ID: {booking.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {booking.events?.title}
                </h3>
                <p className="text-gray-600">
                  Confirmation details have been sent to{" "}
                  {booking.customer_email}
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push("/my-bookings")}
                  className="flex-1"
                >
                  View My Bookings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/events")}
                  className="flex-1"
                >
                  Browse More Events
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Secure Checkout
          </h1>
          <p className="text-gray-600">Complete your booking with Stripe</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Booking Summary
            </CardTitle>
            <CardDescription>Booking ID: {booking.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Details */}
            <div>
              <h3 className="font-semibold text-lg mb-3">
                {booking.events?.title}
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {booking.events?.start_date &&
                      booking.events?.start_time &&
                      formatDate(
                        booking.events.start_date,
                        booking.events.start_time
                      )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {booking.events?.start_time &&
                      (booking.events?.end_time
                        ? `${formatTime(
                            booking.events.start_time
                          )} - ${formatTime(booking.events.end_time)}`
                        : formatTime(booking.events.start_time))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{booking.events?.location_name}</span>
                </div>
                {booking.events?.location_address && (
                  <p className="text-sm text-gray-500 ml-6">
                    {booking.events.location_address}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-3">Customer Information</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Name:</span>{" "}
                  {booking.customer_name}
                </p>
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {booking.customer_email}
                </p>
                {booking.customer_phone && (
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {booking.customer_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Ticket Details */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-3">Tickets</h4>
              <div className="space-y-2">
                {booking.booking_items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.ticket_types?.name}
                    </span>
                    <span>${(item.total_price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${(booking.total_price || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Platform fee (5%)</span>
                  <span>${((booking.total_price || 0) * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>${((booking.total_price || 0) * 1.05).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const eventSlug = booking.events?.slug || "event";
                  router.push(`/events/${eventSlug}/book`);
                }}
                className="flex-1"
                disabled={processing}
              >
                Back to Booking
              </Button>
              <Button
                onClick={handlePayWithStripe}
                disabled={processing}
                className="flex-1 flex items-center gap-2 bg-[#635BFF] hover:bg-[#5A52FF]"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay with Stripe
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                🔒 Secure payment powered by Stripe
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your payment information is encrypted and secure
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
