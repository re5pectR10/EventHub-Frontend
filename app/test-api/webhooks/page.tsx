"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const sampleWebhookPayloads = {
  checkout_session_completed: {
    id: "evt_test_webhook",
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "cs_test_checkout_session",
        object: "checkout.session",
        amount_total: 5000,
        customer_details: {
          email: "test@example.com",
          name: "Test Customer",
        },
        metadata: {
          event_id: "test-event-id",
          tickets: JSON.stringify([
            {
              ticket_type_id: "test-ticket-type-id",
              quantity: 2,
            },
          ]),
        },
        payment_intent: "pi_test_payment_intent",
        payment_status: "paid",
        status: "complete",
      },
    },
    type: "checkout.session.completed",
  },
  payment_intent_succeeded: {
    id: "evt_test_webhook",
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "pi_test_payment_intent",
        object: "payment_intent",
        amount: 5000,
        currency: "usd",
        status: "succeeded",
      },
    },
    type: "payment_intent.succeeded",
  },
  payment_intent_failed: {
    id: "evt_test_webhook",
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "pi_test_payment_intent_failed",
        object: "payment_intent",
        amount: 5000,
        currency: "usd",
        status: "requires_payment_method",
        last_payment_error: {
          message: "Your card was declined.",
          type: "card_error",
        },
      },
    },
    type: "payment_intent.payment_failed",
  },
  account_updated: {
    id: "evt_test_webhook",
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "acct_test_account",
        object: "account",
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {
          currently_due: [],
        },
      },
    },
    type: "account.updated",
  },
};

export default function WebhooksTestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [customPayload, setCustomPayload] = useState("");

  const logResult = (testName: string, result: TestResult) => {
    setResults((prev) => ({ ...prev, [testName]: result }));
    setLoading((prev) => ({ ...prev, [testName]: false }));
  };

  const testWebhookEndpoint = async (
    testName: string,
    payload: any,
    headers: Record<string, string> = {}
  ) => {
    setLoading((prev) => ({ ...prev, [testName]: true }));

    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      const data = response.ok ? await response.json() : await response.text();

      logResult(testName, {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : `${response.status}: ${data}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testHealthCheck = async () => {
    setLoading((prev) => ({ ...prev, health: true }));

    try {
      const response = await fetch("/api/webhooks");
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

  const testCustomPayload = async () => {
    if (!customPayload.trim()) {
      alert("Please enter a custom payload");
      return;
    }

    try {
      const payload = JSON.parse(customPayload);
      await testWebhookEndpoint("custom", payload);
    } catch (error) {
      logResult("custom", {
        success: false,
        error: "Invalid JSON payload",
        timestamp: new Date().toISOString(),
      });
    }
  };

  const clearResults = () => {
    setResults({});
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Webhooks API Test Page</h1>

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

        {/* Stripe Webhook Events */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Stripe Webhook Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() =>
                testWebhookEndpoint(
                  "checkout_completed",
                  sampleWebhookPayloads.checkout_session_completed
                )
              }
              disabled={loading.checkout_completed}
              variant="outline"
            >
              {loading.checkout_completed
                ? "Testing..."
                : "Checkout Session Completed"}
            </Button>

            <Button
              onClick={() =>
                testWebhookEndpoint(
                  "payment_succeeded",
                  sampleWebhookPayloads.payment_intent_succeeded
                )
              }
              disabled={loading.payment_succeeded}
              variant="outline"
            >
              {loading.payment_succeeded
                ? "Testing..."
                : "Payment Intent Succeeded"}
            </Button>

            <Button
              onClick={() =>
                testWebhookEndpoint(
                  "payment_failed",
                  sampleWebhookPayloads.payment_intent_failed
                )
              }
              disabled={loading.payment_failed}
              variant="outline"
            >
              {loading.payment_failed ? "Testing..." : "Payment Intent Failed"}
            </Button>

            <Button
              onClick={() =>
                testWebhookEndpoint(
                  "account_updated",
                  sampleWebhookPayloads.account_updated
                )
              }
              disabled={loading.account_updated}
              variant="outline"
            >
              {loading.account_updated ? "Testing..." : "Account Updated"}
            </Button>
          </div>
        </Card>

        {/* Custom Payload Testing */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Webhook Payload</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customPayload">Custom JSON Payload</Label>
              <Textarea
                id="customPayload"
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                placeholder='{"id": "evt_test", "type": "test.event", "data": {"object": {...}}}'
                rows={6}
                className="font-mono"
              />
            </div>
            <Button
              onClick={testCustomPayload}
              disabled={loading.custom}
              variant="outline"
            >
              {loading.custom ? "Testing..." : "Test Custom Payload"}
            </Button>
          </div>
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

        {/* Sample Payloads Reference */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Sample Webhook Payloads
          </h2>
          <div className="space-y-4">
            {Object.entries(sampleWebhookPayloads).map(
              ([eventType, payload]) => (
                <div key={eventType}>
                  <h3 className="font-medium mb-2 capitalize">
                    {eventType.replace("_", " ")}
                  </h3>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </div>
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
