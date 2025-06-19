"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api";
import { toast } from "@/lib/notifications";
import { CheckCircle, Users, Calendar, TrendingUp } from "lucide-react";

interface OrganizerProfile {
  business_name: string;
  description: string;
  contact_email: string;
  website: string;
  logo_url: string;
  location: string;
}

export default function BecomeOrganizerPage() {
  const [profile, setProfile] = useState<OrganizerProfile>({
    business_name: "",
    description: "",
    contact_email: "",
    website: "",
    logo_url: "",
    location: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAlreadyOrganizer, setIsAlreadyOrganizer] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkUserStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/signin");
          return;
        }

        setUser(user);

        // Check if user is already an organizer
        const response = await apiService.getOrganizerProfile();
        if (response.organizer) {
          setIsAlreadyOrganizer(true);
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkUserStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.createOrganizerProfile(profile);

      if (response.error) {
        throw new Error(response.error);
      }

      setSuccess(
        "Congratulations! Your organizer profile has been created successfully!"
      );
      toast.success(
        "Welcome to the organizer community! Redirecting to your dashboard..."
      );

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error creating organizer profile:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create organizer profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof OrganizerProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAlreadyOrganizer) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're Already an Organizer!
              </h2>
              <p className="text-gray-600 mb-6">
                You already have an organizer profile. You can manage your
                events and profile from your dashboard.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/profile">Edit Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Become an Event Organizer
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of organizers who trust our platform to create
            amazing events, sell tickets, and connect with their audience.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Reach More People</h3>
              <p className="text-gray-600">
                Connect with a wider audience and grow your community through
                our platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Easy Event Management
              </h3>
              <p className="text-gray-600">
                Create, manage, and track your events with our intuitive
                dashboard.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Grow Your Business</h3>
              <p className="text-gray-600">
                Increase revenue and build your brand with powerful analytics
                and tools.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Registration Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Your Organizer Profile</CardTitle>
            <CardDescription>
              Fill in your details below to start organizing events on our
              platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="business_name" className="text-sm font-medium">
                  Business/Organization Name *
                </label>
                <Input
                  id="business_name"
                  type="text"
                  value={profile.business_name}
                  onChange={(e) =>
                    handleInputChange("business_name", e.target.value)
                  }
                  placeholder="Your business or organization name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Tell people about your organization..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contact_email" className="text-sm font-medium">
                  Contact Email *
                </label>
                <Input
                  id="contact_email"
                  type="email"
                  value={profile.contact_email}
                  onChange={(e) =>
                    handleInputChange("contact_email", e.target.value)
                  }
                  placeholder="contact@yourcompany.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium">
                  Website
                </label>
                <Input
                  id="website"
                  type="url"
                  value={profile.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="logo_url" className="text-sm font-medium">
                  Logo URL
                </label>
                <Input
                  id="logo_url"
                  type="url"
                  value={profile.logo_url}
                  onChange={(e) =>
                    handleInputChange("logo_url", e.target.value)
                  }
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Location
                </label>
                <Input
                  id="location"
                  type="text"
                  value={profile.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  placeholder="City, Country"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Creating Profile..." : "Become an Organizer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Already an organizer?{" "}
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Go to your dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
