"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function TestOrganizerBookings() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const testDebugAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/debug-auth");
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      setAuthStatus({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const testOrganizerBookings = async () => {
    try {
      setLoading(true);

      // Get current session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setResult({ error: "No active session. Please sign in first." });
        return;
      }

      const response = await fetch("/api/bookings/organizer", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data,
        token_present: !!session.access_token,
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "fc_cska@yahoo.com",
        password: "your_password_here", // You'll need to update this
      });

      if (error) {
        setAuthStatus({ error: error.message });
      } else {
        setAuthStatus({ success: "Signed in successfully" });
        // Refresh auth status after sign in
        setTimeout(testDebugAuth, 1000);
      }
    } catch (error) {
      setAuthStatus({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthStatus(null);
    setResult(null);
    // Refresh auth status after sign out
    setTimeout(testDebugAuth, 1000);
  };

  useEffect(() => {
    // Check initial auth state
    testDebugAuth();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Organizer Bookings API</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Auth Status:</h3>
          <pre className="text-sm overflow-auto bg-white p-2 rounded">
            {JSON.stringify(authStatus, null, 2)}
          </pre>
          <div className="mt-2 space-x-2">
            <button
              onClick={testDebugAuth}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? "..." : "Check Auth"}
            </button>
            <button
              onClick={signIn}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
              disabled={loading}
            >
              Sign In
            </button>
            <button
              onClick={signOut}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              disabled={loading}
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">API Test Result:</h3>
          <pre className="text-sm overflow-auto bg-white p-2 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
          <button
            onClick={testOrganizerBookings}
            className="mt-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            disabled={loading}
          >
            {loading ? "Testing..." : "Test Organizer Bookings API"}
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h4 className="font-semibold text-yellow-800">Instructions:</h4>
          <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
            <li>Update the password in the sign-in function above</li>
            <li>Click "Sign In" to authenticate with fc_cska@yahoo.com</li>
            <li>Click "Test Organizer Bookings API" to test the endpoint</li>
            <li>Check the result - should show organizer bookings data</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
