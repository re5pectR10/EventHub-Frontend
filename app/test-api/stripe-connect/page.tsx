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
  const [formData, setFormData] = useState({
    business_email: "",
    business_name: "",
    country: "US",
  });

  const testStripeConnect = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get auth token from wherever you store it (localStorage, cookies, etc.)
      const authToken = localStorage.getItem("access_token"); // Adjust based on your auth implementation

      console.log("Sending request with data:", formData);

      const response = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify(formData),
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
        <div>
          <label className="block text-sm font-medium mb-1">
            Business Email
          </label>
          <input
            type="email"
            value={formData.business_email}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                business_email: e.target.value,
              }))
            }
            className="w-full p-2 border rounded"
            placeholder="business@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Business Name
          </label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                business_name: e.target.value,
              }))
            }
            className="w-full p-2 border rounded"
            placeholder="My Business LLC"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <select
            value={formData.country}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, country: e.target.value }))
            }
            className="w-full p-2 border rounded"
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
          </select>
        </div>

        <button
          onClick={testStripeConnect}
          disabled={
            isLoading || !formData.business_email || !formData.business_name
          }
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
          <li>Check the browser console for detailed request/response logs</li>
          <li>The API will validate Content-Type is application/json</li>
          <li>Empty or malformed JSON will return a specific error message</li>
          <li>Check your Stripe dashboard for created accounts</li>
        </ul>
      </div>
    </div>
  );
}
