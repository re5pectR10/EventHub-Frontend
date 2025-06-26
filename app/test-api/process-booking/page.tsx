"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface BookingTicket {
  type: string;
  quantity: number;
  price: number;
}

interface BookingAttendee {
  name: string;
  email: string;
  phone?: string;
}

export default function ProcessBookingTestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Test data
  const [testData, setTestData] = useState({
    eventId: "",
    tickets: [
      {
        type: "",
        quantity: 1,
        price: 50.0,
      },
    ] as BookingTicket[],
    attendees: [
      {
        name: "",
        email: "",
        phone: "",
      },
    ] as BookingAttendee[],
    specialRequests: "",
    authToken: "",
  });

  const logResult = (testName: string, result: TestResult) => {
    setResults((prev) => ({ ...prev, [testName]: result }));
    setLoading((prev) => ({ ...prev, [testName]: false }));
  };

  const testProcessBooking = async () => {
    if (!testData.eventId.trim()) {
      alert("Please enter an event ID");
      return;
    }

    if (!testData.authToken.trim()) {
      alert("Please enter an auth token");
      return;
    }

    setLoading((prev) => ({ ...prev, process_booking: true }));

    try {
      const response = await fetch("/api/process-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testData.authToken}`,
        },
        body: JSON.stringify({
          eventId: testData.eventId,
          tickets: testData.tickets.filter((t) => t.type.trim()),
          attendees: testData.attendees.filter(
            (a) => a.name.trim() && a.email.trim()
          ),
          specialRequests: testData.specialRequests || undefined,
        }),
      });

      const data = response.ok ? await response.json() : await response.text();

      logResult("process_booking", {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : `${response.status}: ${data}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("process_booking", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testHealthCheck = async () => {
    setLoading((prev) => ({ ...prev, health: true }));

    try {
      const response = await fetch("/api/process-booking");
      const data = await response.json();

      logResult("health", {
        success: response.ok,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("health", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const addTicket = () => {
    setTestData((prev) => ({
      ...prev,
      tickets: [...prev.tickets, { type: "", quantity: 1, price: 50.0 }],
    }));
  };

  const removeTicket = (index: number) => {
    setTestData((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index),
    }));
  };

  const updateTicket = (
    index: number,
    field: keyof BookingTicket,
    value: any
  ) => {
    setTestData((prev) => ({
      ...prev,
      tickets: prev.tickets.map((ticket, i) =>
        i === index ? { ...ticket, [field]: value } : ticket
      ),
    }));
  };

  const addAttendee = () => {
    setTestData((prev) => ({
      ...prev,
      attendees: [...prev.attendees, { name: "", email: "", phone: "" }],
    }));
  };

  const removeAttendee = (index: number) => {
    setTestData((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index),
    }));
  };

  const updateAttendee = (
    index: number,
    field: keyof BookingAttendee,
    value: string
  ) => {
    setTestData((prev) => ({
      ...prev,
      attendees: prev.attendees.map((attendee, i) =>
        i === index ? { ...attendee, [field]: value } : attendee
      ),
    }));
  };

  const clearResults = () => {
    setResults({});
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Process Booking API Test Page</h1>

      <div className="space-y-6">
        {/* Health Check */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Health Check</h2>
          <Button
            onClick={testHealthCheck}
            disabled={loading.health}
            className="mr-4"
          >
            {loading.health ? "Testing..." : "Test Health Check"}
          </Button>
        </Card>

        {/* Test Data Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Configuration</h2>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="eventId">Event ID *</Label>
              <Input
                id="eventId"
                value={testData.eventId}
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, eventId: e.target.value }))
                }
                placeholder="Enter event ID"
              />
            </div>
            <div>
              <Label htmlFor="authToken">Auth Token *</Label>
              <Input
                id="authToken"
                type="password"
                value={testData.authToken}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    authToken: e.target.value,
                  }))
                }
                placeholder="Enter JWT token"
              />
            </div>
          </div>

          {/* Tickets Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Tickets</h3>
              <Button onClick={addTicket} size="sm" variant="outline">
                Add Ticket
              </Button>
            </div>

            {testData.tickets.map((ticket, index) => (
              <div key={index} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Ticket {index + 1}</span>
                  {testData.tickets.length > 1 && (
                    <Button
                      onClick={() => removeTicket(index)}
                      size="sm"
                      variant="outline"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Ticket Type ID</Label>
                    <Input
                      value={ticket.type}
                      onChange={(e) =>
                        updateTicket(index, "type", e.target.value)
                      }
                      placeholder="Enter ticket type ID"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={ticket.quantity}
                      onChange={(e) =>
                        updateTicket(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticket.price}
                      onChange={(e) =>
                        updateTicket(
                          index,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Attendees Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Attendees</h3>
              <Button onClick={addAttendee} size="sm" variant="outline">
                Add Attendee
              </Button>
            </div>

            {testData.attendees.map((attendee, index) => (
              <div key={index} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Attendee {index + 1}</span>
                  {testData.attendees.length > 1 && (
                    <Button
                      onClick={() => removeAttendee(index)}
                      size="sm"
                      variant="outline"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={attendee.name}
                      onChange={(e) =>
                        updateAttendee(index, "name", e.target.value)
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={attendee.email}
                      onChange={(e) =>
                        updateAttendee(index, "email", e.target.value)
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone (Optional)</Label>
                    <Input
                      value={attendee.phone || ""}
                      onChange={(e) =>
                        updateAttendee(index, "phone", e.target.value)
                      }
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Special Requests */}
          <div className="mb-6">
            <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
            <Textarea
              id="specialRequests"
              value={testData.specialRequests}
              onChange={(e) =>
                setTestData((prev) => ({
                  ...prev,
                  specialRequests: e.target.value,
                }))
              }
              placeholder="Any special requests or notes..."
              rows={3}
            />
          </div>

          <Button
            onClick={testProcessBooking}
            disabled={loading.process_booking}
            className="w-full"
          >
            {loading.process_booking ? "Processing..." : "Process Booking"}
          </Button>
        </Card>

        {/* Results */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            <Button onClick={clearResults} variant="outline" size="sm">
              Clear Results
            </Button>
          </div>

          {Object.keys(results).length === 0 ? (
            <p className="text-gray-500">No tests run yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(results).map(([testName, result]) => (
                <div
                  key={testName}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold capitalize">
                      {testName.replace("_", " ")}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        result.success
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {result.success ? "SUCCESS" : "ERROR"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {result.timestamp}
                  </p>
                  {result.error && (
                    <p className="text-red-600 text-sm mb-2">{result.error}</p>
                  )}
                  {result.data && (
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
