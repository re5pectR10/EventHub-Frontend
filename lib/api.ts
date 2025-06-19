import { createClient } from "@/utils/supabase/client";
import type {
  Event,
  Category,
  Organizer,
  Booking,
  EventSearchParams,
  ApiResponse,
  TicketType,
} from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

class ApiService {
  private supabase = createClient();

  private async fetchWithAuth<T>(
    functionName: string,
    path: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      // Get current session for authentication
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options?.headers as Record<string, string>) || {}),
      };

      // Add authorization header if session exists
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${functionName}${path}`,
        {
          ...options,
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Events
  async getEvents(params?: EventSearchParams): Promise<ApiResponse<Event[]>> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    const path = `${queryString ? `?${queryString}` : ""}`;

    return this.fetchWithAuth<Event[]>("events", path);
  }

  async getFeaturedEvents(): Promise<ApiResponse<Event[]>> {
    return this.fetchWithAuth<Event[]>("events", "/featured");
  }

  async getEvent(id: string): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", `/${id}`);
  }

  async getEventBySlug(slug: string): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", `/slug/${slug}`);
  }

  async createEvent(eventData: Partial<Event>): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", "", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(
    id: string,
    eventData: Partial<Event>
  ): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", `/${id}`, {
      method: "PUT",
      body: JSON.stringify(eventData),
    });
  }

  async updateEventStatus(
    id: string,
    status: "draft" | "published" | "cancelled"
  ): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", `/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async deleteEvent(id: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<void>("events", `/${id}`, {
      method: "DELETE",
    });
  }

  // Ticket Types
  async createTicketType(ticketData: {
    event_id: string;
    name: string;
    description?: string;
    price: number;
    quantity_available: number;
    sale_start_date?: string;
    sale_end_date?: string;
    max_per_order?: number;
  }): Promise<ApiResponse<TicketType>> {
    return this.fetchWithAuth<TicketType>("ticket-types", "", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  }

  async updateTicketType(
    id: string,
    ticketData: Partial<TicketType>
  ): Promise<ApiResponse<TicketType>> {
    return this.fetchWithAuth<TicketType>("ticket-types", `/${id}`, {
      method: "PUT",
      body: JSON.stringify(ticketData),
    });
  }

  async deleteTicketType(id: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<void>("ticket-types", `/${id}`, {
      method: "DELETE",
    });
  }

  // Note: getEventTicketTypes removed as ticket types are included in getEvent response

  // Stripe Connect
  async createStripeConnectAccount(): Promise<
    ApiResponse<{ account_link_url: string }>
  > {
    return this.fetchWithAuth<{ account_link_url: string }>(
      "stripe",
      "/connect/create",
      {
        method: "POST",
      }
    );
  }

  async getStripeConnectStatus(): Promise<
    ApiResponse<{
      account_id?: string;
      verification_status?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
    }>
  > {
    return this.fetchWithAuth<{
      account_id?: string;
      verification_status?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
    }>("stripe", "/connect/status");
  }

  async createStripeCheckoutSession(data: {
    event_id: string;
    tickets: Array<{
      ticket_type_id: string;
      quantity: number;
    }>;
    customer_email?: string;
  }): Promise<ApiResponse<{ checkout_url: string; session_id: string }>> {
    return this.fetchWithAuth<{ checkout_url: string; session_id: string }>(
      "stripe",
      "/checkout/create",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  // Categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.fetchWithAuth<Category[]>("categories", "");
  }

  // Organizers
  async getOrganizers(): Promise<Organizer[]> {
    const response = await this.fetchWithAuth<Organizer[]>("organizers", "");
    return response.data || [];
  }

  async getOrganizerProfile(): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", "/profile");
  }

  async createOrganizerProfile(
    organizerData: Partial<Organizer>
  ): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", "/profile", {
      method: "POST",
      body: JSON.stringify(organizerData),
    });
  }

  async updateOrganizerProfile(
    organizerData: Partial<Organizer>
  ): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", "/profile", {
      method: "PUT",
      body: JSON.stringify(organizerData),
    });
  }

  async getOrganizerEvents(): Promise<ApiResponse<Event[]>> {
    return this.fetchWithAuth<Event[]>("events", "/my-events");
  }

  // Get single event for organizer (includes their own draft events)
  async getOrganizerEvent(id: string): Promise<ApiResponse<Event>> {
    // Try to get from organizer's events first
    const organizerEventsResponse = await this.getOrganizerEvents();
    if (organizerEventsResponse.events) {
      const event = organizerEventsResponse.events.find((e) => e.id === id);
      if (event) {
        return { event };
      }
    }

    // Fallback to regular getEvent
    return this.getEvent(id);
  }

  // Bookings
  async getBookings(): Promise<ApiResponse<Booking[]>> {
    return this.fetchWithAuth<Booking[]>("bookings", "");
  }

  async getOrganizerBookings(): Promise<ApiResponse<Booking[]>> {
    return this.fetchWithAuth<Booking[]>("bookings", "/organizer");
  }

  async getBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.fetchWithAuth<Booking>("bookings", `/${id}`);
  }

  async createBooking(bookingData: {
    event_id: string;
    items: Array<{
      ticket_type_id: string;
      quantity: number;
    }>;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
  }): Promise<ApiResponse<{ booking: Booking; checkout_url: string }>> {
    return this.fetchWithAuth<{ booking: Booking; checkout_url: string }>(
      "bookings",
      "",
      {
        method: "POST",
        body: JSON.stringify(bookingData),
      }
    );
  }

  async cancelBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.fetchWithAuth<Booking>("bookings", `/${id}/cancel`, {
      method: "POST",
    });
  }

  // Search events with advanced filtering
  async searchEvents(params: EventSearchParams): Promise<ApiResponse<Event[]>> {
    return this.getEvents(params);
  }
}

export const apiService = new ApiService();
