"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { DashboardNav } from "@/components/layout/dashboard-nav";
import { apiService } from "@/lib/api";

// Form-specific interface for profile editing
interface OrganizerProfileForm {
  business_name: string;
  description: string;
  contact_email: string;
  website: string;
  logo_url: string;
  location: string;
  stripe_account_id?: string;
  verification_status?: "pending" | "verified" | "rejected";
}

export default function OrganizerProfilePage() {
  const [profile, setProfile] = useState<OrganizerProfileForm>({
    business_name: "",
    description: "",
    contact_email: "",
    website: "",
    logo_url: "",
    location: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const response = await apiService.getOrganizerProfile();

        if (response.organizer) {
          // Map the organizer response to profile format
          const profileData = {
            business_name: response.organizer.business_name || "",
            description: response.organizer.description || "",
            contact_email: response.organizer.contact_email || "",
            website: response.organizer.website || "",
            logo_url: response.organizer.logo_url || "",
            location: response.organizer.location || "",
            stripe_account_id: response.organizer.stripe_account_id || "",
            verification_status:
              response.organizer.verification_status || "pending",
          };
          setProfile(profileData);
          setHasProfile(true);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = hasProfile
        ? await apiService.updateOrganizerProfile(profile)
        : await apiService.createOrganizerProfile(profile);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.organizer) {
        // Map the organizer response to profile format
        const updatedProfile = {
          business_name: response.organizer.business_name || "",
          description: response.organizer.description || "",
          contact_email: response.organizer.contact_email || "",
          website: response.organizer.website || "",
          logo_url: response.organizer.logo_url || "",
          location: response.organizer.location || "",
          stripe_account_id: response.organizer.stripe_account_id || "",
          verification_status:
            response.organizer.verification_status || "pending",
        };
        setProfile(updatedProfile);
        setHasProfile(true);
      }

      setSuccess(
        hasProfile
          ? "Profile updated successfully!"
          : "Profile created successfully!"
      );
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStripeConnect = async () => {
    if (!hasProfile) {
      setError("Please save your profile first before connecting Stripe.");
      return;
    }

    setConnectingStripe(true);
    setError(null);

    try {
      const response = await apiService.createStripeConnectAccount();

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data?.account_link_url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = response.data.account_link_url;
      }
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect Stripe account. Please try again."
      );
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleInputChange = (
    field: keyof OrganizerProfileForm,
    value: string
  ) => {
    setProfile((prev: OrganizerProfileForm) => ({ ...prev, [field]: value }));
  };

  const getStripeStatusColor = () => {
    if (!profile.stripe_account_id) return "text-gray-500";
    switch (profile.verification_status) {
      case "verified":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const getStripeStatusIcon = () => {
    if (!profile.stripe_account_id) return <CreditCard className="h-4 w-4" />;
    switch (profile.verification_status) {
      case "verified":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStripeStatusText = () => {
    if (!profile.stripe_account_id) return "Not connected";
    switch (profile.verification_status) {
      case "verified":
        return "Connected & Verified";
      case "rejected":
        return "Verification Failed";
      default:
        return "Pending Verification";
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {hasProfile ? "Edit Organizer Profile" : "Create Organizer Profile"}
          </h1>
          <p className="mt-2 text-gray-600">
            {hasProfile
              ? "Update your organizer information"
              : "Set up your organizer profile to start creating events"}
          </p>
        </div>

        {/* Dashboard Navigation */}
        <DashboardNav />

        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {hasProfile
                  ? "Edit Organizer Profile"
                  : "Create Organizer Profile"}
              </CardTitle>
              <CardDescription>
                {hasProfile
                  ? "Update your organizer information and business details."
                  : "Set up your organizer profile to start creating events."}
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
                  <Label htmlFor="business_name">Business Name *</Label>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={profile.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Tell people about your organization..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
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
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profile.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
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
                  <Label htmlFor="location">Location</Label>
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
                    {saving
                      ? "Saving..."
                      : hasProfile
                      ? "Update Profile"
                      : "Create Profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Stripe Connect Card */}
          {hasProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Processing
                </CardTitle>
                <CardDescription>
                  Connect your Stripe account to receive payments for ticket
                  sales. Our platform collects a 5% service fee from each
                  transaction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={getStripeStatusColor()}>
                        {getStripeStatusIcon()}
                      </div>
                      <div>
                        <p className="font-medium">Stripe Account</p>
                        <p className={`text-sm ${getStripeStatusColor()}`}>
                          {getStripeStatusText()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!profile.stripe_account_id ? (
                        <Button
                          onClick={handleStripeConnect}
                          disabled={connectingStripe}
                          className="flex items-center gap-2"
                        >
                          {connectingStripe ? (
                            "Connecting..."
                          ) : (
                            <>
                              Connect Stripe
                              <ExternalLink className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleStripeConnect}
                          disabled={connectingStripe}
                          className="flex items-center gap-2"
                        >
                          {connectingStripe ? (
                            "Updating..."
                          ) : (
                            <>
                              Manage Account
                              <ExternalLink className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {profile.verification_status === "rejected" && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">
                        Your Stripe account verification was rejected. Please
                        contact support or try connecting a different account.
                      </p>
                    </div>
                  )}

                  {profile.verification_status === "pending" &&
                    profile.stripe_account_id && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-600">
                          Your Stripe account is pending verification. You can
                          create events but cannot receive payments until
                          verification is complete.
                        </p>
                      </div>
                    )}

                  {profile.verification_status === "verified" && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-600">
                        Your Stripe account is verified and ready to receive
                        payments!
                      </p>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Connect your Stripe account to receive payments</li>
                      <li>
                        Customers pay for tickets through our secure checkout
                      </li>
                      <li>
                        We collect a 5% platform fee from each transaction
                      </li>
                      <li>
                        Remaining funds are transferred to your Stripe account
                      </li>
                      <li>
                        Payouts follow Stripe&apos;s standard schedule
                        (typically 2-7 business days)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
