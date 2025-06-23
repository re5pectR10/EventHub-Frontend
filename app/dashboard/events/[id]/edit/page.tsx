"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCategories, useEventById, useUpdateEvent } from "@/lib/api";
import type { EventFormData } from "@/lib/types";

export default function EditEventPage() {
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    location_name: "",
    location_address: "",
    category_id: "",
    capacity: 0,
    featured: false,
    status: "draft",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  // Use React Query hooks
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useEventById(eventId);

  const updateEventMutation = useUpdateEvent();

  // Set error from query if exists
  const queryError = categoriesError?.message || eventError?.message || null;
  if (queryError && !error) {
    setError(queryError);
  }

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/signin");
          return;
        }
      } catch (error) {
        console.error("Error initializing:", error);
        setError(
          error instanceof Error ? error.message : "Failed to initialize"
        );
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Update form data when event data is loaded
  useEffect(() => {
    if (eventData) {
      setFormData({
        title: eventData.title || "",
        description: eventData.description || "",
        start_date: eventData.start_date || "",
        start_time: eventData.start_time || "",
        end_date: eventData.end_date || "",
        end_time: eventData.end_time || "",
        location_name: eventData.location_name || "",
        location_address: eventData.location_address || "",
        category_id: (eventData as any).category_id || "",
        capacity: (eventData as any).capacity || 0,
        featured: eventData.featured || false,
        status: eventData.status || "draft",
      });
    }
  }, [eventData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        eventData: formData,
      });
      router.push("/dashboard/events");
    } catch (error) {
      console.error("Error updating event:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  const handleInputChange = (
    field: keyof EventFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading || categoriesLoading || eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.title) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
          <p className="mt-2 text-gray-600">
            The event you're looking for doesn't exist or you don't have
            permission to edit it.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/dashboard/events")}
          >
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Event</CardTitle>
            <CardDescription>Update your event details below.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Event Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="category_id" className="text-sm font-medium">
                    Category *
                  </label>
                  <select
                    id="category_id"
                    value={formData.category_id}
                    onChange={(e) =>
                      handleInputChange("category_id", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your event..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="start_date" className="text-sm font-medium">
                    Start Date *
                  </label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      handleInputChange("start_date", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="start_time" className="text-sm font-medium">
                    Start Time *
                  </label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      handleInputChange("start_time", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="end_date" className="text-sm font-medium">
                    End Date
                  </label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      handleInputChange("end_date", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="end_time" className="text-sm font-medium">
                    End Time
                  </label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      handleInputChange("end_time", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="location_name"
                    className="text-sm font-medium"
                  >
                    Venue Name *
                  </label>
                  <Input
                    id="location_name"
                    type="text"
                    value={formData.location_name}
                    onChange={(e) =>
                      handleInputChange("location_name", e.target.value)
                    }
                    placeholder="Enter venue name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="capacity" className="text-sm font-medium">
                    Capacity
                  </label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      handleInputChange(
                        "capacity",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="Maximum attendees"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="location_address"
                  className="text-sm font-medium"
                >
                  Venue Address *
                </label>
                <Input
                  id="location_address"
                  type="text"
                  value={formData.location_address}
                  onChange={(e) =>
                    handleInputChange("location_address", e.target.value)
                  }
                  placeholder="Enter venue address"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="featured"
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    handleInputChange("featured", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="featured" className="text-sm font-medium">
                  Featured Event
                </label>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    handleInputChange(
                      "status",
                      e.target.value as "draft" | "published" | "cancelled"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/events")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateEventMutation.isPending}>
                  {updateEventMutation.isPending
                    ? "Updating..."
                    : "Update Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
