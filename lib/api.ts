import { createClient } from "@/utils/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  start_date: string;
  end_date: string;
  location_name: string;
  location_address: string;
  location_latitude?: number;
  location_longitude?: number;
  status: "draft" | "published" | "cancelled";
  featured: boolean;
  created_at: string;
  updated_at: string;
  organizers: {
    id: string;
    business_name: string;
    contact_email?: string;
    description?: string;
    website?: string;
  };
  event_categories: {
    name: string;
    slug: string;
  };
  event_images: Array<{
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
    display_order: number;
  }>;
  ticket_types: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    quantity_available: number;
    quantity_sold: number;
  }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface Organizer {
  id: string;
  name: string;
  business_name?: string;
  description?: string;
  contact_email?: string;
  website?: string;
  logo_url?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  events_count?: number;
}

export interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  total_price: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: "pending" | "confirmed" | "cancelled";
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  events: {
    title: string;
    start_date: string;
    start_time: string;
    location_name: string;
    location_address?: string;
  };
  booking_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    ticket_types: {
      name: string;
      description?: string;
    };
  }>;
  tickets: Array<{
    id: string;
    ticket_code: string;
    qr_code: string;
    status: string;
    scanned_at?: string;
  }>;
}

export interface EventSearchParams {
  query?: string;
  category?: string;
  featured?: boolean;
  date_from?: string;
  date_to?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  sort?: "date_asc" | "date_desc" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  data?: T;
  events?: Event[];
  categories?: Category[];
  bookings?: Booking[];
  booking?: Booking;
  organizer?: Organizer;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}

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
    const path = `/events${queryString ? `?${queryString}` : ""}`;

    return this.fetchWithAuth<Event[]>("events", path);
  }

  async getFeaturedEvents(): Promise<ApiResponse<Event[]>> {
    return this.fetchWithAuth<Event[]>("events", "/events/featured");
  }

  async getEvent(identifier: string): Promise<ApiResponse<Event>> {
    const response = await this.fetchWithAuth<any>(
      "events",
      `/events/${identifier}`
    );
    if ((response as any).event) {
      return { data: (response as any).event };
    }
    return response;
  }

  async createEvent(eventData: Partial<Event>): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", "/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(
    id: string,
    eventData: Partial<Event>
  ): Promise<ApiResponse<Event>> {
    return this.fetchWithAuth<Event>("events", `/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<void>("events", `/events/${id}`, {
      method: "DELETE",
    });
  }

  // Categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.fetchWithAuth<Category[]>("categories", "/categories");
  }

  // Organizers
  async getOrganizerProfile(): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", "/organizers/profile");
  }

  async createOrganizerProfile(
    organizerData: Partial<Organizer>
  ): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", "/organizers/profile", {
      method: "POST",
      body: JSON.stringify(organizerData),
    });
  }

  async updateOrganizerProfile(
    organizerData: Partial<Organizer>
  ): Promise<ApiResponse<Organizer>> {
    return this.fetchWithAuth<Organizer>("organizers", "/organizers/profile", {
      method: "PUT",
      body: JSON.stringify(organizerData),
    });
  }

  async getOrganizerEvents(): Promise<ApiResponse<Event[]>> {
    return this.fetchWithAuth<Event[]>("organizers", "/organizers/events");
  }

  // Bookings
  async getBookings(): Promise<ApiResponse<Booking[]>> {
    return this.fetchWithAuth<Booking[]>("bookings", "/bookings");
  }

  async getBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.fetchWithAuth<Booking>("bookings", `/bookings/${id}`);
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
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify(bookingData),
      }
    );
  }

  async cancelBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.fetchWithAuth<Booking>("bookings", `/bookings/${id}/cancel`, {
      method: "POST",
    });
  }

  // Search events with advanced filtering
  async searchEvents(params: EventSearchParams): Promise<ApiResponse<Event[]>> {
    return this.getEvents(params);
  }
}

export const apiService = new ApiService();
