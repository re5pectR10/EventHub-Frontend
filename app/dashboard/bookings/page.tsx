"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Download,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api";
import type { Booking, BookingSummary } from "@/lib/types";

export default function BookingsManagementPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<BookingSummary>({
    totalBookings: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    pendingBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadBookings() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/signin");
          return;
        }

        // Load organizer's bookings
        const response = await apiService.getOrganizerBookings();

        if (response.error) {
          setError(response.error);
          return;
        }

        const bookingsData = response.bookings || [];
        setBookings(bookingsData);
        setFilteredBookings(bookingsData);

        // Calculate summary
        const totalRevenue = bookingsData
          .filter((b) => b.status === "confirmed")
          .reduce((sum, booking) => sum + booking.total_price, 0);

        const totalTicketsSold = bookingsData
          .filter((b) => b.status === "confirmed")
          .reduce((sum, booking) => {
            return (
              sum +
              booking.booking_items.reduce(
                (itemSum, item) => itemSum + item.quantity,
                0
              )
            );
          }, 0);

        const pendingBookings = bookingsData.filter(
          (b) => b.status === "pending"
        ).length;

        setSummary({
          totalBookings: bookingsData.length,
          totalRevenue,
          totalTicketsSold,
          pendingBookings,
        });
      } catch (error) {
        console.error("Error loading bookings:", error);
        setError("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  useEffect(() => {
    // Filter bookings based on search term and status
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.customer_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.customer_email
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.events.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportBookings = () => {
    // Simple CSV export
    const csvData = [
      [
        "Booking ID",
        "Customer Name",
        "Email",
        "Event",
        "Date",
        "Status",
        "Total",
        "Tickets",
      ],
      ...filteredBookings.map((booking) => [
        booking.id,
        booking.customer_name,
        booking.customer_email,
        booking.events.title,
        formatDate(booking.created_at),
        booking.status,
        `$${booking.total_price.toFixed(2)}`,
        booking.booking_items.reduce((sum, item) => sum + item.quantity, 0),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bookings Management
          </h1>
          <p className="mt-2 text-gray-600">
            View and manage all event bookings
          </p>
        </div>

        {/* Dashboard Navigation */}
        <DashboardNav />

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bookings
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summary.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tickets Sold
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalTicketsSold}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.pendingBookings}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by customer name, email, or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button onClick={exportBookings} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No bookings found</p>
              </CardContent>
            </Card>
          ) : (
            filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {booking.events.title}
                      </CardTitle>
                      <CardDescription>
                        Booking #{booking.id.substring(0, 8)}... •{" "}
                        {formatDate(booking.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/bookings/${booking.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Customer
                      </p>
                      <p className="text-sm text-gray-900">
                        {booking.customer_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.customer_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Event Date
                      </p>
                      <p className="text-sm text-gray-900">
                        {new Date(
                          booking.events.start_date
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.events.start_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Amount
                      </p>
                      <p className="text-sm text-gray-900 font-medium">
                        ${booking.total_price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Tickets
                      </p>
                      <p className="text-sm text-gray-900">
                        {booking.booking_items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}{" "}
                        tickets
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Ticket Types
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {booking.booking_items.map((item, index) => (
                        <Badge key={index} variant="outline">
                          {item.ticket_types.name} x{item.quantity} ($
                          {item.total_price.toFixed(2)})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
