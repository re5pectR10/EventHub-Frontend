"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "@/lib/notifications";
import type { Booking } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  Filter,
  Loader2,
  MapPin,
  Receipt,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type BookingStatus = "all" | "confirmed" | "pending" | "cancelled";

export default function MyBookingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus>("all");
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useAuth();

  // Redirect if not authenticated
  const userError =
    !user && !isLoadingUser ? new Error("Not authenticated") : null;

  // Fetch user's bookings
  const {
    data: bookings = [],
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch,
  } = useQuery({
    queryKey: ["user-bookings"],
    queryFn: async () => {
      const response = await apiService.getBookings();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.bookings || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Filter bookings based on search and status
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (booking: Booking) => booking.status === statusFilter
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (booking: Booking) =>
          booking.events?.title?.toLowerCase().includes(query) ||
          booking.customer_name?.toLowerCase().includes(query) ||
          booking.events?.location_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookings, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleRetry = () => {
    refetch();
    toast.success("Refreshing bookings...");
  };

  // Redirect to signin if not authenticated
  if (userError) {
    router.push("/auth/signin");
    return null;
  }

  // Loading state
  if (isLoadingUser || isLoadingBookings) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-48 mb-4" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-96" />
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 animate-pulse rounded w-2/3" />
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (bookingsError) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Bookings
            </h3>
            <p className="text-gray-600 mb-6">
              Something went wrong while loading your bookings.
            </p>
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <Loader2 className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">
            Manage and track all your event bookings in one place
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Bookings</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredBookings.length} booking
            {filteredBookings.length !== 1 ? "s" : ""} found
            {(searchQuery || statusFilter !== "all") && (
              <span className="ml-2 text-sm">
                {searchQuery && `for "${searchQuery}"`}
                {searchQuery && statusFilter !== "all" && " "}
                {statusFilter !== "all" && `with status "${statusFilter}"`}
              </span>
            )}
          </p>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== "all"
                ? "No matching bookings found"
                : "No bookings yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "You haven't made any bookings yet. Start by browsing events!"}
            </p>
            <div className="flex gap-2 justify-center">
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button asChild>
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking: Booking) => (
              <Card
                key={booking.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {booking.events?.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {booking.events?.start_date &&
                                formatDate(booking.events.start_date)}
                            </div>
                            {booking.events?.location_name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {booking.events.location_name}
                              </div>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            Booking ID:
                          </span>
                          <p className="text-gray-600">{booking.id}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Customer:
                          </span>
                          <p className="text-gray-600">
                            {booking.customer_name}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Amount:
                          </span>
                          <p className="text-gray-900 font-medium">
                            {formatCurrency(booking.total_price)}
                          </p>
                        </div>
                      </div>

                      {booking.booking_items &&
                        booking.booking_items.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <span className="font-medium text-gray-700 text-sm">
                              Tickets:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {booking.booking_items.map((item, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  {item.quantity}x {item.ticket_types?.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-40">
                      <Button asChild className="flex-1">
                        <Link href={`/my-bookings/${booking.id}`}>
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>

                      {booking.status === "pending" && (
                        <Button
                          asChild
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Link href={`/checkout/${booking.id}`}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay Now
                          </Link>
                        </Button>
                      )}

                      {booking.status === "confirmed" && (
                        <Button variant="outline" className="flex-1" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination would go here if needed */}
        {filteredBookings.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Showing {filteredBookings.length} of {bookings.length} total
              bookings
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
