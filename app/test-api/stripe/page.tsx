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

export default function StripeTestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Test data
  const [testData, setTestData] = useState({
    eventId: "",
    tickets: [
      {
        ticket_type_id: "",
        quantity: 1,
      },
    ],
    customerEmail: "test@example.com",
  });

  const logResult = (endpoint: string, result: TestResult) => {
    setResults((prev) => ({ ...prev, [endpoint]: result }));
    setLoading((prev) => ({ ...prev, [endpoint]: false }));
  };

  const testStripeHealth = async () => {
    setLoading((prev) => ({ ...prev, health: true }));
    try {
      const response = await fetch("/api/stripe/health");
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

  const testStripeConnectCreate = async () => {
    setLoading((prev) => ({ ...prev, connectCreate: true }));
    try {
      // Get session token
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Authentication required. Please sign in first.");
      }

      const response = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      logResult("connectCreate", {
        success: response.ok,
        data,
        error: !response.ok ? data.error : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("connectCreate", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testStripeConnectStatus = async () => {
    setLoading((prev) => ({ ...prev, connectStatus: true }));
    try {
      // Get session token
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Authentication required. Please sign in first.");
      }

      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      logResult("connectStatus", {
        success: response.ok,
        data,
        error: !response.ok ? data.error : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("connectStatus", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testStripeCheckoutCreate = async () => {
    setLoading((prev) => ({ ...prev, checkoutCreate: true }));
    try {
      if (!testData.eventId || !testData.tickets[0].ticket_type_id) {
        throw new Error("Event ID and Ticket Type ID are required");
      }

      const response = await fetch("/api/stripe/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: testData.eventId,
          tickets: testData.tickets,
          customer_email: testData.customerEmail,
        }),
      });

      const data = await response.json();

      logResult("checkoutCreate", {
        success: response.ok,
        data,
        error: !response.ok ? data.error : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("checkoutCreate", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testStripeWebhook = async () => {
    setLoading((prev) => ({ ...prev, webhook: true }));
    try {
      // This is a mock webhook test - in production, webhooks come from Stripe
      const mockWebhookData = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              event_id: testData.eventId,
              tickets: JSON.stringify(testData.tickets),
            },
            customer_details: {
              email: testData.customerEmail,
              name: "Test Customer",
            },
            amount_total: 5000, // $50.00 in cents
            payment_intent: "pi_test_123",
          },
        },
      };

      const response = await fetch("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test_signature", // Note: This won't pass verification
        },
        body: JSON.stringify(mockWebhookData),
      });

      const data = await response.json();

      logResult("webhook", {
        success: response.ok,
        data,
        error: !response.ok ? data.error : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult("webhook", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const renderResult = (key: string, result?: TestResult) => {
    if (!result) return null;

    return (
      <Card className="p-4 mt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                result.success ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-medium">
              {result.success ? "Success" : "Error"}
            </span>
            <span className="text-sm text-gray-500">{result.timestamp}</span>
          </div>

          {result.error && (
            <div className="text-red-600 text-sm">
              <strong>Error:</strong> {result.error}
            </div>
          )}

          {result.data && (
            <div className="text-sm">
              <strong>Response:</strong>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Stripe API Test Suite</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="eventId">Event ID</Label>
            <Input
              id="eventId"
              value={testData.eventId}
              onChange={(e) =>
                setTestData((prev) => ({ ...prev, eventId: e.target.value }))
              }
              placeholder="Enter event ID for checkout tests"
            />
          </div>

          <div>
            <Label htmlFor="ticketTypeId">Ticket Type ID</Label>
            <Input
              id="ticketTypeId"
              value={testData.tickets[0].ticket_type_id}
              onChange={(e) =>
                setTestData((prev) => ({
                  ...prev,
                  tickets: [
                    { ...prev.tickets[0], ticket_type_id: e.target.value },
                  ],
                }))
              }
              placeholder="Enter ticket type ID"
            />
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={testData.tickets[0].quantity}
              onChange={(e) =>
                setTestData((prev) => ({
                  ...prev,
                  tickets: [
                    {
                      ...prev.tickets[0],
                      quantity: parseInt(e.target.value) || 1,
                    },
                  ],
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="customerEmail">Customer Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={testData.customerEmail}
              onChange={(e) =>
                setTestData((prev) => ({
                  ...prev,
                  customerEmail: e.target.value,
                }))
              }
              placeholder="test@example.com"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Health Check */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Health Check</h3>
          <Button
            onClick={testStripeHealth}
            disabled={loading.health}
            variant="outline"
          >
            {loading.health ? "Testing..." : "Test Health Endpoint"}
          </Button>
          {renderResult("health", results.health)}
        </div>

        {/* Stripe Connect */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Stripe Connect</h3>
          <div className="flex gap-2">
            <Button
              onClick={testStripeConnectCreate}
              disabled={loading.connectCreate}
              variant="outline"
            >
              {loading.connectCreate ? "Testing..." : "Create Connect Account"}
            </Button>
            <Button
              onClick={testStripeConnectStatus}
              disabled={loading.connectStatus}
              variant="outline"
            >
              {loading.connectStatus ? "Testing..." : "Get Connect Status"}
            </Button>
          </div>
          {renderResult("connectCreate", results.connectCreate)}
          {renderResult("connectStatus", results.connectStatus)}
        </div>

        {/* Checkout */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Checkout Session</h3>
          <Button
            onClick={testStripeCheckoutCreate}
            disabled={loading.checkoutCreate}
            variant="outline"
          >
            {loading.checkoutCreate ? "Testing..." : "Create Checkout Session"}
          </Button>
          {renderResult("checkoutCreate", results.checkoutCreate)}
        </div>

        {/* Webhook */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Webhook Handler</h3>
          <Button
            onClick={testStripeWebhook}
            disabled={loading.webhook}
            variant="outline"
          >
            {loading.webhook ? "Testing..." : "Test Webhook (Mock)"}
          </Button>
          <p className="text-sm text-gray-600 mt-1">
            Note: This sends a mock webhook payload. Real webhooks come from
            Stripe and require proper signature verification.
          </p>
          {renderResult("webhook", results.webhook)}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-medium text-yellow-800">Notes:</h4>
        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
          <li>• Make sure you're signed in for Connect API tests</li>
          <li>
            • Create an organizer profile before testing Connect endpoints
          </li>
          <li>• Use real event and ticket type IDs for checkout tests</li>
          <li>
            • Webhook signature verification will fail in this test environment
          </li>
          <li>• Environment variables must be configured for production use</li>
        </ul>
      </div>
    </div>
  );
}
