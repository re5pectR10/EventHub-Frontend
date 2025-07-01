"use client";

import { useState } from "react";

export default function TestStripeConnectPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    account_id: string;
    onboarding_url: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note] = useState(
    "No form data needed - the API now uses your organizer profile data automatically!"
  );

  const testStripeConnect = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get auth token from wherever you store it (localStorage, cookies, etc.)
      const authToken = localStorage.getItem("access_token"); // Adjust based on your auth implementation

      console.log("Sending request (no body needed - uses profile data)");

      const response = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Failed to parse response as JSON: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      console.error("Stripe Connect test error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Stripe Connect API</h1>

      <div className="max-w-md space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">{note}</p>
        </div>

        <button
          onClick={testStripeConnect}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Test Stripe Connect Creation"}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold">Success:</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Testing Notes:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            Make sure you&apos;re logged in and have organizer permissions
          </li>
          <li>
            Ensure you have a complete organizer profile with business name and
            contact email
          </li>
          <li>Check the browser console for detailed request/response logs</li>
          <li>The API now uses your organizer profile data automatically</li>
          <li>Check your Stripe dashboard for created accounts</li>
        </ul>
      </div>
    </div>
  );
}
