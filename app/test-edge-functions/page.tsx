"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { edgeFunctionsService } from "@/lib/edge-functions";

export default function TestEdgeFunctions() {
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testProcessBooking = async () => {
    setLoading(true);
    setError(null);
    setBookingResult(null);

    try {
      const testBookingData = {
        eventId: "test-event-123",
        tickets: [
          { type: "Standard", quantity: 2, price: 50 },
          { type: "VIP", quantity: 1, price: 100 },
        ],
        attendees: [
          { name: "John Doe", email: "john@example.com", phone: "+1234567890" },
        ],
        specialRequests: "Vegetarian meal preference",
      };

      const result = await edgeFunctionsService.processBooking(testBookingData);
      setBookingResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testSendEmail = async () => {
    setLoading(true);
    setError(null);
    setEmailResult(null);

    try {
      const testEmailData = {
        bookingId: "booking-123",
        userEmail: "test@example.com",
        eventName: "Test Event",
        eventDate: new Date().toISOString(),
        totalAmount: 200,
      };

      const result = await edgeFunctionsService.sendBookingConfirmation(
        testEmailData
      );
      setEmailResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testCompleteBooking = async () => {
    setLoading(true);
    setError(null);
    setBookingResult(null);

    try {
      const testBookingData = {
        eventId: "test-event-456",
        tickets: [{ type: "Standard", quantity: 1, price: 75 }],
        attendees: [
          {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+1987654321",
          },
        ],
        specialRequests: "Wheelchair accessible seating",
      };

      const result = await edgeFunctionsService.completeBooking(
        testBookingData,
        "Complete Test Event",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      );
      setBookingResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Edge Functions Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Button
          onClick={testProcessBooking}
          disabled={loading}
          className="h-12"
        >
          {loading ? "Testing..." : "Test Process Booking"}
        </Button>

        <Button
          onClick={testSendEmail}
          disabled={loading}
          variant="outline"
          className="h-12"
        >
          {loading ? "Testing..." : "Test Send Email"}
        </Button>

        <Button
          onClick={testCompleteBooking}
          disabled={loading}
          variant="secondary"
          className="h-12"
        >
          {loading ? "Testing..." : "Test Complete Booking"}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {bookingResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(bookingResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {emailResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(emailResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Edge Functions Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <span>process-booking: Deployed and Active</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <span>send-booking-confirmation: Deployed and Active</span>
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-4">
            Functions are running on:
            https://uejnmldtpqgdpbxemvpv.supabase.co/functions/v1/
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
