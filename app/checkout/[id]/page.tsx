"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiService } from "@/lib/api";
import { toast } from "@/lib/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;

  // Check if this is a success callback from Stripe
  const sessionId = searchParams.get("session_id");
  const isSuccess = searchParams.get("success") === "true";

  // Fetch booking data using React Query
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
      return response.booking || response.data;
    },
    enabled: !!bookingId,
    retry: 2,
  });

  // Create Stripe checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("No booking data");

      // Create Stripe checkout session using the booking ID
      const response = await fetch("/api/stripe/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: booking.id,
          success_url: `${window.location.origin}/checkout/${booking.id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/checkout/${booking.id}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (!data.checkout_url) {
        throw new Error("No checkout URL received");
      }

      return data.checkout_url;
    },
    onSuccess: (checkoutUrl) => {
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create checkout session"
      );
    },
  });

  const handlePayWithStripe = () => {
    createCheckoutMutation.mutate();
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

  const handleRetry = () => {
    refetch();
    toast.success("Refreshing booking data...");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Checkout Error
          </h1>
          <p className="text-gray-600 mb-8">
            {error instanceof Error ? error.message : "Booking not found"}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => router.push("/events")}>
              Browse Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check for success callback from Stripe or confirmed booking
  const paymentSuccess = isSuccess && sessionId;
  const isConfirmed = booking.status === "confirmed";

  // Show success state if payment is completed
  if (paymentSuccess || isConfirmed) {
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
                <Button onClick={() => router.push("/my-bookings")}>
                  View My Bookings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/events")}
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

  // Main checkout view
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your booking</p>
        </div>

        {/* Event Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{booking.events?.title}</CardTitle>
            <CardDescription>
              {booking.events?.start_date &&
                booking.events?.start_time &&
                formatDate(
                  booking.events.start_date,
                  booking.events.start_time
                )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {booking.events?.start_date &&
                  booking.events?.start_time &&
                  formatTime(booking.events.start_time)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{booking.events?.location_name || "Location TBA"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.booking_items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {item.ticket_types?.name || "Ticket"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    ${(item.total_price || 0).toFixed(2)}
                  </p>
                </div>
              ))}

              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span>${(booking.total_price || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {booking.customer_name}
              </p>
              <p>
                <span className="font-medium">Email:</span>{" "}
                {booking.customer_email}
              </p>
              <p>
                <span className="font-medium">Phone:</span>{" "}
                {booking.customer_phone || "Not provided"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment
            </CardTitle>
            <CardDescription>
              Complete your payment to confirm the booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePayWithStripe}
              className="w-full"
              size="lg"
              disabled={createCheckoutMutation.isPending}
            >
              {createCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Checkout...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${(booking.total_price || 0).toFixed(2)} with Stripe
                </>
              )}
            </Button>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Secure payment powered by Stripe
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <div className="text-center text-sm text-gray-600">
          <p>
            By completing this purchase, you agree to our{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
