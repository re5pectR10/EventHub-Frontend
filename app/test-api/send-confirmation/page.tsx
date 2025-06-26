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

interface EmailTicket {
  type: string;
  quantity: number;
  price: number;
}

interface EmailAttendee {
  name: string;
  email: string;
}

export default function SendConfirmationTestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Test data
  const [testData, setTestData] = useState({
    bookingId: "BKG-12345-TEST",
    userEmail: "",
    eventName: "Sample Concert 2024",
    eventDate: "Saturday, March 15, 2024 at 7:00 PM",
    totalAmount: 120.0,
    tickets: [
      {
        type: "General Admission",
        quantity: 2,
        price: 45.0,
      },
      {
        type: "VIP Package",
        quantity: 1,
        price: 30.0,
      },
    ] as EmailTicket[],
    attendees: [
      {
        name: "John Doe",
        email: "john@example.com",
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
      },
    ] as EmailAttendee[],
  });

  const logResult = (testName: string, result: TestResult) => {
    setResults((prev) => ({ ...prev, [testName]: result }));
    setLoading((prev) => ({ ...prev, [testName]: false }));
  };

  const testSendConfirmation = async () => {
    if (!testData.userEmail.trim()) {
      alert("Please enter a user email");
      return;
    }

    setLoading((prev) => ({ ...prev, send_confirmation: true }));

    try {
      const response = await fetch("/api/send-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: testData.bookingId,
          userEmail: testData.userEmail,
          eventName: testData.eventName,
          eventDate: testData.eventDate,
          totalAmount: testData.totalAmount,
          tickets: testData.tickets.filter((t) => t.type.trim()),
          attendees: testData.attendees.filter(
            (a) => a.name.trim() && a.email.trim()
          ),
        }),
      });

      const data = response.ok ? await response.json() : await response.text();

      logResult("send_confirmation", {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : `${response.status}: ${data}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("send_confirmation", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testHealthCheck = async () => {
    setLoading((prev) => ({ ...prev, health: true }));

    try {
      const response = await fetch("/api/send-confirmation");
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

  const testTemplatePreview = async () => {
    setLoading((prev) => ({ ...prev, preview: true }));

    try {
      const response = await fetch("/api/send-confirmation?preview=true");

      if (
        response.ok &&
        response.headers.get("content-type")?.includes("text/html")
      ) {
        // Open preview in new window
        const html = await response.text();
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        }

        logResult("preview", {
          success: true,
          data: { message: "Preview opened in new window" },
          timestamp: new Date().toISOString(),
        });
      } else {
        const data = await response.text();
        logResult("preview", {
          success: false,
          error: `${response.status}: ${data}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logResult("preview", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading((prev) => ({ ...prev, preview: false }));
    }
  };

  const addTicket = () => {
    setTestData((prev) => ({
      ...prev,
      tickets: [...prev.tickets, { type: "", quantity: 1, price: 25.0 }],
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
    field: keyof EmailTicket,
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
      attendees: [...prev.attendees, { name: "", email: "" }],
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
    field: keyof EmailAttendee,
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

  const loadSampleData = () => {
    setTestData({
      bookingId: `BKG-${Date.now()}-SAMPLE`,
      userEmail: "test@example.com",
      eventName: "Amazing Music Festival 2024",
      eventDate: "Saturday, April 20, 2024 at 6:00 PM",
      totalAmount: 195.0,
      tickets: [
        { type: "Early Bird", quantity: 2, price: 65.0 },
        { type: "VIP Experience", quantity: 1, price: 65.0 },
      ],
      attendees: [
        { name: "Alice Johnson", email: "alice@example.com" },
        { name: "Bob Wilson", email: "bob@example.com" },
        { name: "Carol Davis", email: "carol@example.com" },
      ],
    });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Send Confirmation API Test Page
      </h1>

      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={testHealthCheck}
              disabled={loading.health}
              variant="outline"
            >
              {loading.health ? "Testing..." : "Health Check"}
            </Button>
            <Button
              onClick={testTemplatePreview}
              disabled={loading.preview}
              variant="outline"
            >
              {loading.preview ? "Loading..." : "Preview Email Template"}
            </Button>
            <Button onClick={loadSampleData} variant="outline">
              Load Sample Data
            </Button>
          </div>
        </Card>

        {/* Email Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input
                id="bookingId"
                value={testData.bookingId}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    bookingId: e.target.value,
                  }))
                }
                placeholder="BKG-12345-TEST"
              />
            </div>
            <div>
              <Label htmlFor="userEmail">User Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={testData.userEmail}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    userEmail: e.target.value,
                  }))
                }
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={testData.eventName}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    eventName: e.target.value,
                  }))
                }
                placeholder="Event name"
              />
            </div>
            <div>
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                value={testData.eventDate}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    eventDate: e.target.value,
                  }))
                }
                placeholder="Date and time"
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total Amount ($)</Label>
              <Input
                id="totalAmount"
                type="number"
                min="0"
                step="0.01"
                value={testData.totalAmount}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    totalAmount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          {/* Tickets Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Tickets (Optional)</h3>
              <Button onClick={addTicket} size="sm" variant="outline">
                Add Ticket
              </Button>
            </div>

            {testData.tickets.map((ticket, index) => (
              <div key={index} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Ticket {index + 1}</span>
                  <Button
                    onClick={() => removeTicket(index)}
                    size="sm"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Ticket Type</Label>
                    <Input
                      value={ticket.type}
                      onChange={(e) =>
                        updateTicket(index, "type", e.target.value)
                      }
                      placeholder="General Admission"
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
              <h3 className="text-lg font-medium">Attendees (Optional)</h3>
              <Button onClick={addAttendee} size="sm" variant="outline">
                Add Attendee
              </Button>
            </div>

            {testData.attendees.map((attendee, index) => (
              <div key={index} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Attendee {index + 1}</span>
                  <Button
                    onClick={() => removeAttendee(index)}
                    size="sm"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={attendee.name}
                      onChange={(e) =>
                        updateAttendee(index, "name", e.target.value)
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={attendee.email}
                      onChange={(e) =>
                        updateAttendee(index, "email", e.target.value)
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={testSendConfirmation}
            disabled={loading.send_confirmation}
            className="w-full"
          >
            {loading.send_confirmation
              ? "Sending..."
              : "Send Confirmation Email"}
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
                    <div className="mt-2">
                      {testName === "send_confirmation" &&
                      result.data.templates ? (
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-1">
                              Generated Templates:
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Plain Text:</Label>
                                <Textarea
                                  value={result.data.templates.text}
                                  readOnly
                                  rows={8}
                                  className="text-xs font-mono"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">HTML Preview:</Label>
                                <iframe
                                  srcDoc={result.data.templates.html}
                                  className="w-full h-48 border rounded"
                                  title="Email Preview"
                                />
                              </div>
                            </div>
                          </div>
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                            {JSON.stringify(
                              {
                                success: result.data.success,
                                message: result.data.message,
                                booking_id: result.data.booking_id,
                                recipient: result.data.recipient,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      ) : (
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
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
