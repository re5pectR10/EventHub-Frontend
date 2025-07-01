"use client";

import { useState } from "react";

export default function TestWebhooksPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | object | null>(null);

  const testWebhookEndpoint = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/webhook", {
        method: "GET",
      });
      const result = await response.json();
      console.log("Webhook endpoint test:", result);
      setTestResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to test webhook endpoint"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Stripe Webhooks Testing</h1>

      <div className="space-y-6">
        {/* Webhook Endpoint Test */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Test Webhook Endpoint</h2>
          <button
            onClick={testWebhookEndpoint}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Testing..." : "Test GET /api/stripe/webhook"}
          </button>
        </div>

        {/* Webhook Configuration Guide */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">
            Configure Connect Webhooks in Stripe
          </h2>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">
                🔧 Setup Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
                <li>
                  Go to{" "}
                  <a
                    href="https://dashboard.stripe.com/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Stripe Dashboard → Webhooks
                  </a>
                </li>
                <li>
                  Click <strong>&quot;Create endpoint&quot;</strong>
                </li>
                <li>
                  Set URL to:{" "}
                  <code className="bg-yellow-100 px-1 rounded">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : "https://yourdomain.com"}
                    /api/stripe/webhook
                  </code>
                </li>
                <li>
                  <strong>IMPORTANT:</strong> Under &quot;Listen to&quot;,
                  select{" "}
                  <strong>&quot;Events on Connected accounts&quot;</strong> (NOT
                  &quot;Events on your account&quot;)
                </li>
                <li>
                  Add these events:
                  <ul className="list-disc list-inside mt-1 ml-4">
                    <li>
                      <code>account.updated</code>
                    </li>
                    <li>
                      <code>account.application.deauthorized</code>
                    </li>
                    <li>
                      <code>checkout.session.completed</code>
                    </li>
                    <li>
                      <code>payment_intent.succeeded</code>
                    </li>
                    <li>
                      <code>payment_intent.payment_failed</code>
                    </li>
                  </ul>
                </li>
                <li>
                  Copy the webhook signing secret to your environment variables
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">
                📋 Environment Variables Needed
              </h3>
              <pre className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                {`STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000`}
              </pre>
            </div>

            <div className="bg-green-50 p-4 rounded border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">
                ✅ Common Issues & Solutions
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                <li>
                  <strong>Wrong webhook type:</strong> Must be &quot;Connect
                  webhook&quot; not &quot;Account webhook&quot;
                </li>
                <li>
                  <strong>Missing HTTPS:</strong> Production webhooks require
                  HTTPS URLs
                </li>
                <li>
                  <strong>Incorrect URL:</strong> Make sure URL is accessible
                  and returns 200
                </li>
                <li>
                  <strong>Missing events:</strong> account.updated is critical
                  for connected account status
                </li>
                <li>
                  <strong>Database verification_status:</strong> Only accepts
                  &quot;pending&quot;, &quot;verified&quot;, or
                  &quot;rejected&quot; (enum type)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {typeof testResult === "string"
                ? testResult
                : JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Webhook Testing with Stripe CLI */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Test with Stripe CLI</h2>
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-medium mb-2">For Connect webhooks:</h3>
            <pre className="text-sm bg-gray-800 text-green-400 p-2 rounded mb-2">
              {`# Listen for Connect webhook events
stripe listen --forward-connect-to localhost:3000/api/stripe/webhook

# In another terminal, trigger a Connect event
stripe trigger account.updated --stripe-account acct_connected_account_id`}
            </pre>
            <p className="text-sm text-gray-600">
              Note: Use <code>--forward-connect-to</code> for Connect webhooks,
              not <code>--forward-to</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
