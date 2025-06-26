"use client";

import { useState } from "react";
import { useCategories } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";

export default function CategoriesTestPage() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestingDirect, setIsTestingDirect] = useState(false);

  const { data: categories, isLoading, error, refetch } = useCategories();

  // Test direct API call
  const testDirectApiCall = async () => {
    setIsTestingDirect(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setTestResult(
          `✅ Direct API call successful! Found ${
            data.categories?.length || 0
          } categories`
        );
      } else {
        setTestResult(
          `❌ Direct API call failed: ${response.status} - ${response.statusText}`
        );
      }
    } catch (error) {
      setTestResult(
        `❌ Direct API call error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsTestingDirect(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              Categories API Migration Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* React Query Hook Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    React Query Hook Test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>Loading:</strong> {isLoading ? "✅ Yes" : "❌ No"}
                    </p>
                    <p>
                      <strong>Error:</strong>{" "}
                      {error ? `❌ ${error}` : "✅ None"}
                    </p>
                    <p>
                      <strong>Categories:</strong> {categories?.length || 0}
                    </p>

                    <Button
                      onClick={() => refetch()}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refetch
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Direct API Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Direct API Call Test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={testDirectApiCall}
                      disabled={isTestingDirect}
                      className="flex items-center gap-2"
                    >
                      {isTestingDirect ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "🧪"
                      )}
                      Test Direct API Call
                    </Button>

                    {testResult && (
                      <p className="text-sm p-2 bg-gray-100 rounded">
                        {testResult}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Categories Data Display */}
            {categories && categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Categories Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="p-2 border rounded text-sm"
                      >
                        <div>
                          <strong>{category.name}</strong>
                        </div>
                        <div className="text-gray-600">{category.slug}</div>
                        {category.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {category.description.slice(0, 50)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Migration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {error ? (
                    <XCircle className="text-red-500" />
                  ) : (
                    <CheckCircle className="text-green-500" />
                  )}
                  Migration Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    ✅ Categories API route created:{" "}
                    <code>/api/categories</code>
                  </p>
                  <p>✅ Supabase server client configured</p>
                  <p>✅ API service updated to use Next.js route</p>
                  <p>✅ React Query hooks updated</p>

                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <p className="font-medium">Next Steps:</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• Test in production environment</li>
                      <li>• Update CORS settings if needed</li>
                      <li>• Remove edge function after testing</li>
                      <li>• Migrate next endpoint (organizers)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
