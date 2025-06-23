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

  async getOrganizerById(id: string): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", `/${id}`);
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

// Custom React Query Hooks

// Events Hooks
export function useEvents(params: EventSearchParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.events.list(params),
    queryFn: () => apiService.getEvents(params),
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
      return response.event;
    },
    enabled: !!slug,
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
      const response = await apiService.getCategories(); // No getOrganizers method exists
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
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
      return response.data;
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
      return response.data;
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
      return response.data || [];
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
      const response = await apiService.getOrganizerBookings();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
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
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Tickets Hooks - No getTicketsByEvent method exists, tickets come with event data
export function useTicketsByEvent(eventId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tickets.byEvent(eventId),
    queryFn: async () => {
      const response = await apiService.getEvent(eventId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.ticket_types || [];
    },
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// Mutations
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingData: any) => apiService.createBooking(bookingData),
    onSuccess: () => {
      // Invalidate and refetch bookings
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.bookings.userBookings,
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
    },
  });
}
