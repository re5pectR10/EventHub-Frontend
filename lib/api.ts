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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Query Keys - centralized for consistency
export const QUERY_KEYS = {
  events: {
    all: ["events"] as const,
    lists: () => [...QUERY_KEYS.events.all, "list"] as const,
    list: (params: EventSearchParams) =>
      [...QUERY_KEYS.events.lists(), params] as const,
    details: () => [...QUERY_KEYS.events.all, "detail"] as const,
    detail: (slug: string) => [...QUERY_KEYS.events.details(), slug] as const,
    featured: ["events", "featured"] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  organizers: {
    all: ["organizers"] as const,
    lists: () => [...QUERY_KEYS.organizers.all, "list"] as const,
    details: () => [...QUERY_KEYS.organizers.all, "detail"] as const,
    detail: (id: string) => [...QUERY_KEYS.organizers.details(), id] as const,
    profile: ["organizers", "profile"] as const,
    events: ["organizers", "events"] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    lists: () => [...QUERY_KEYS.bookings.all, "list"] as const,
    details: () => [...QUERY_KEYS.bookings.all, "detail"] as const,
    detail: (id: string) => [...QUERY_KEYS.bookings.details(), id] as const,
    userBookings: ["bookings", "user"] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    byEvent: (eventId: string) =>
      [...QUERY_KEYS.tickets.all, "event", eventId] as const,
  },
} as const;

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

  // Events - migrated to Next.js API routes
  async getEvents(params?: EventSearchParams): Promise<ApiResponse<Event[]>> {
    try {
      const searchParams = new URLSearchParams();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }

      const queryString = searchParams.toString();
      const response = await fetch(
        `/api/events${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
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
      console.error("Events API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getFeaturedEvents(): Promise<ApiResponse<Event[]>> {
    try {
      const response = await fetch("/api/events/featured", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Featured Events API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getEvent(id: string): Promise<ApiResponse<Event>> {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Event API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getEventBySlug(slug: string): Promise<ApiResponse<Event>> {
    // Use the unified route that handles both ID and slug
    return this.getEvent(slug);
  }

  async createEvent(eventData: Partial<Event>): Promise<ApiResponse<Event>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Create Event API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateEvent(
    id: string,
    eventData: Partial<Event>
  ): Promise<ApiResponse<Event>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Update Event API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateEventStatus(
    id: string,
    status: "draft" | "published" | "cancelled"
  ): Promise<ApiResponse<Event>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/events/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Update Event Status API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteEvent(id: string): Promise<ApiResponse<void>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Delete Event API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Ticket Types - migrated to Next.js API routes
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
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `/api/events/${ticketData.event_id}/tickets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(ticketData),
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
      console.error("Create Ticket Type API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTicketType(id: string): Promise<ApiResponse<TicketType>> {
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ticket Type API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTicketTypesByEvent(
    eventId: string
  ): Promise<ApiResponse<TicketType[]>> {
    try {
      const response = await fetch(`/api/tickets/event/${eventId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ticket Types API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateTicketType(
    id: string,
    ticketData: Partial<TicketType>
  ): Promise<ApiResponse<TicketType>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Update Ticket Type API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteTicketType(id: string): Promise<ApiResponse<void>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/tickets/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Delete Ticket Type API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Note: getEventTicketTypes removed as ticket types are included in getEvent response

  // Stripe Connect
  async createStripeConnectAccount(): Promise<
    ApiResponse<{ account_link_url: string; account_id: string }>
  > {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      const headers: Record<string, string> = {};

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Stripe Connect API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getStripeConnectStatus(): Promise<
    ApiResponse<{
      account_id?: string;
      verification_status?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      requirements?: any;
    }>
  > {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Stripe Connect Status API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createStripeCheckoutSession(data: {
    event_id: string;
    tickets: Array<{
      ticket_type_id: string;
      quantity: number;
    }>;
    customer_email?: string;
  }): Promise<ApiResponse<{ checkout_url: string; session_id: string }>> {
    try {
      const response = await fetch("/api/stripe/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Stripe Checkout API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Categories - migrated to Next.js API route
  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Categories API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Organizers - migrated to Next.js API routes
  async getOrganizers(): Promise<Organizer[]> {
    try {
      const response = await fetch("/api/organizers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Organizers API Error:", error);
      return [];
    }
  }

  async getOrganizerProfile(): Promise<ApiResponse<Organizer>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/organizers/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Organizer Profile API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getOrganizerById(id: string): Promise<ApiResponse<Organizer>> {
    try {
      const response = await fetch(`/api/organizers/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Organizer By ID API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createOrganizerProfile(
    organizerData: Partial<Organizer>
  ): Promise<ApiResponse<Organizer>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/organizers/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(organizerData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Create Organizer Profile API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateOrganizerProfile(
    organizerData: Partial<Organizer>
  ): Promise<ApiResponse<Organizer>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/organizers/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(organizerData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Update Organizer Profile API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getOrganizerEvents(): Promise<ApiResponse<Event[]>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/events/my-events", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Organizer Events API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
  // Bookings - migrated to Next.js API routes
  async getBookings(): Promise<ApiResponse<Booking[]>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/bookings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Bookings API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getOrganizerBookings(): Promise<ApiResponse<Booking[]>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/bookings/organizer", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Organizer Bookings API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getBooking(id: string): Promise<ApiResponse<Booking>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/bookings/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Booking API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: Authentication is optional for booking creation
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Create Booking API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelBooking(id: string): Promise<ApiResponse<Booking>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Cancel Booking API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateBookingStatus(
    id: string,
    status: "pending" | "confirmed" | "cancelled"
  ): Promise<ApiResponse<Booking>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Update Booking Status API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Search events with advanced filtering
  async searchEvents(params: EventSearchParams): Promise<ApiResponse<Event[]>> {
    return this.getEvents(params);
  }
}

export const apiService = new ApiService();

// Custom React Query Hooks

// Events Hooks
export function useEvents(params: EventSearchParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.events.list(params),
    queryFn: async () => {
      const response = await apiService.getEvents(params);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

export function useFeaturedEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.events.featured,
    queryFn: async () => {
      const response = await apiService.getFeaturedEvents();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.events || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useEventBySlug(slug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.events.detail(slug),
    queryFn: async () => {
      const response = await apiService.getEventBySlug(slug);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.event || response.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useEventById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.events.detail(id),
    queryFn: async () => {
      const response = await apiService.getEvent(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.event || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Categories Hooks
export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories.all,
    queryFn: async () => {
      const response = await apiService.getCategories();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.categories || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Organizers Hooks
export function useOrganizers() {
  return useQuery({
    queryKey: QUERY_KEYS.organizers.lists(),
    queryFn: async () => {
      const organizers = await apiService.getOrganizers();
      return organizers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useOrganizerById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.organizers.detail(id),
    queryFn: async () => {
      const response = await apiService.getOrganizerById(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || response.organizer;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useOrganizerProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.organizers.profile,
    queryFn: async () => {
      const response = await apiService.getOrganizerProfile();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || response.organizer;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

export function useOrganizerEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.organizers.events,
    queryFn: async () => {
      const response = await apiService.getOrganizerEvents();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.events || response.data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// Bookings Hooks
export function useUserBookings() {
  return useQuery({
    queryKey: QUERY_KEYS.bookings.userBookings,
    queryFn: async () => {
      const response = await apiService.getBookings();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.bookings || response.data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function useOrganizerBookings() {
  return useQuery({
    queryKey: [...QUERY_KEYS.bookings.userBookings, "organizer"],
    queryFn: async () => {
      const response = await apiService.getOrganizerBookings();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.bookings || response.data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function useBookingById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.bookings.detail(id),
    queryFn: async () => {
      const response = await apiService.getBooking(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.booking || response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Tickets Hooks
export function useTicketsByEvent(eventId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tickets.byEvent(eventId),
    queryFn: async () => {
      const response = await apiService.getTicketTypesByEvent(eventId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.ticket_types || [];
    },
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function useTicketType(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tickets.all, "detail", id],
    queryFn: async () => {
      const response = await apiService.getTicketType(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.ticket_type || response.data;
    },
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// Stripe Hooks
export function useStripeConnectStatus() {
  return useQuery({
    queryKey: ["stripe", "connect", "status"],
    queryFn: async () => {
      const response = await apiService.getStripeConnectStatus();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Dashboard Hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      try {
        // Fetch organizer's events
        const eventsResponse = await apiService.getOrganizerEvents();
        // Fetch bookings for organizer's events
        const bookingsResponse = await apiService.getOrganizerBookings();

        if (eventsResponse.error || bookingsResponse.error) {
          throw new Error(
            eventsResponse.error ||
              bookingsResponse.error ||
              "Failed to load dashboard data"
          );
        }

        const events = eventsResponse.events || eventsResponse.data || [];
        const bookings =
          bookingsResponse.bookings || bookingsResponse.data || [];

        // Calculate stats
        const upcomingEvents = events.filter(
          (event: any) => new Date(event.start_date) > new Date()
        );
        const totalRevenue = bookings.reduce(
          (sum: number, booking: any) => sum + (booking.total_price || 0),
          0
        );

        return {
          eventsCount: events.length,
          totalBookings: bookings.length,
          totalRevenue,
          upcomingEvents: upcomingEvents.slice(0, 5),
          recentBookings: bookings.slice(0, 5),
        };
      } catch (error) {
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Mutations
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData: Partial<Event>) =>
      apiService.createEvent(eventData),
    onSuccess: () => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.organizers.events,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.all,
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "stats"],
      });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      eventData,
    }: {
      id: string;
      eventData: Partial<Event>;
    }) => apiService.updateEvent(id, eventData),
    onSuccess: (data, variables) => {
      // Invalidate specific event and lists
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.organizers.events,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.all,
      });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => apiService.deleteEvent(eventId),
    onSuccess: () => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.organizers.events,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.all,
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "stats"],
      });
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "published" | "cancelled";
    }) => apiService.updateEventStatus(id, status),
    onSuccess: (data, variables) => {
      // Invalidate specific event and lists
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.organizers.events,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.all,
      });
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingData: any) => apiService.createBooking(bookingData),
    onSuccess: () => {
      // Invalidate and refetch bookings
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.userBookings,
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "stats"],
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => apiService.cancelBooking(bookingId),
    onSuccess: (data, variables) => {
      // Invalidate specific booking and lists
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.detail(variables),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.userBookings,
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "stats"],
      });
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketData: any) => apiService.createTicketType(ticketData),
    onSuccess: (data, variables) => {
      // Invalidate tickets for the specific event
      if (variables.event_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.tickets.byEvent(variables.event_id),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.events.detail(variables.event_id),
        });
      }
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ticketData }: { id: string; ticketData: any }) =>
      apiService.updateTicketType(id, ticketData),
    onSuccess: (data, variables) => {
      // Invalidate tickets for the specific event
      if (variables.ticketData.event_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.tickets.byEvent(variables.ticketData.event_id),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.events.detail(variables.ticketData.event_id),
        });
      }
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) =>
      apiService.deleteTicketType(id),
    onSuccess: (data, variables) => {
      // Invalidate tickets for the specific event
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tickets.byEvent(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.events.detail(variables.eventId),
      });
    },
  });
}

export function useCreateStripeConnectAccount() {
  return useMutation({
    mutationFn: () => apiService.createStripeConnectAccount(),
  });
}

export function useCreateStripeCheckoutSession() {
  return useMutation({
    mutationFn: (data: {
      event_id: string;
      tickets: Array<{
        ticket_type_id: string;
        quantity: number;
      }>;
      customer_email?: string;
    }) => apiService.createStripeCheckoutSession(data),
  });
}

export function useCreateOrganizerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizerData: Partial<Organizer>) =>
      apiService.createOrganizerProfile(organizerData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.organizers.profile,
      });
    },
  });
}

export function useUpdateOrganizerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizerData: Partial<Organizer>) =>
      apiService.updateOrganizerProfile(organizerData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.organizers.profile,
      });
    },
  });
}
