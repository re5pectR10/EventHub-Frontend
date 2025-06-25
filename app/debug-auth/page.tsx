"use client";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function DebugAuthPage() {
  const { user, isLoading, isInitialized, error, serverChecked } = useAuth();

  const handleRefresh = () => {
    console.log("🔄 Manually refreshing page...");
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Auth State</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>User:</strong>{" "}
              {user ? `${user.email} (ID: ${user.id})` : "None"}
            </div>
            <div>
              <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
            </div>
            <div>
              <strong>Initialized:</strong> {isInitialized ? "Yes" : "No"}
            </div>
            <div>
              <strong>Server Checked:</strong> {serverChecked ? "Yes" : "No"}
            </div>
            <div>
              <strong>Error:</strong> {error || "None"}
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open browser DevTools console</li>
            <li>Click the "Refresh Page" button below</li>
            <li>Watch the console for duplicate auth calls</li>
            <li>Look for messages starting with 🔍, 🚀, ✅, or ❌</li>
          </ol>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Actions</h2>
          <div className="space-x-2">
            <Button onClick={handleRefresh}>Refresh Page</Button>
            <Button
              variant="outline"
              onClick={() =>
                console.log("Current auth state:", {
                  user,
                  isLoading,
                  isInitialized,
                  serverChecked,
                })
              }
            >
              Log Current State
            </Button>
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-blue-50">
          <h2 className="text-lg font-semibold mb-2">Expected Behavior</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              Only <strong>ONE</strong> "🔍 Server auth: Cache miss..." should
              appear on refresh
            </li>
            <li>
              Only <strong>ONE</strong> "✅ Auth initialized..." should appear
            </li>
            <li>If you see duplicates, we need to investigate further</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
