"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Download, Mail } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function BookingSuccessContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyBooking() {
      if (!sessionId) {
        setError("No session ID found");
        setLoading(false);
        return;
      }

      try {
        // In a real implementation, you would verify the session with your backend
        // For now, we'll just show a success message
        setBookingDetails({
          sessionId,
          status: "confirmed",
          message: "Your booking has been confirmed!",
        });
      } catch (error) {
        console.error("Error verifying booking:", error);
        setError("Failed to verify booking");
      } finally {
        setLoading(false);
      }
    }

    verifyBooking();
  }, [sessionId]);

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
          <p className="mt-4">Verifying your booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Booking Error
          </h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <div className="space-y-4">
            <Button onClick={() => router.push(`/events/${slug}/book`)}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push("/events")}>
              Browse Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your tickets have been confirmed.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-medium text-green-800">Payment Successful</p>
                <p className="text-sm text-green-600">
                  Session ID: {sessionId}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">What happens next?</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>
                    You'll receive a confirmation email with your tickets
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Download or print your tickets from the email</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Bring your tickets (digital or printed) to the event
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">
                Important Information
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  • Please arrive at least 15 minutes before the event starts
                </p>
                <p>• Bring a valid ID that matches the name on your booking</p>
                <p>• Check your email for any event updates or changes</p>
                <p>• Contact the organizer if you have any questions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => router.push(`/events/${slug}`)}
            className="flex-1"
          >
            View Event Details
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/events")}
            className="flex-1"
          >
            Browse More Events
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact our support team or the event organizer.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking details...</p>
          </div>
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
