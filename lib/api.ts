const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}

class ApiService {
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
    const endpoint = `/events${queryString ? `?${queryString}` : ""}`;

    return this.fetch<Event[]>(endpoint);
  }

  async getFeaturedEvents(): Promise<ApiResponse<Event[]>> {
    return this.fetch<Event[]>("/events/featured");
  }

  async getEvent(identifier: string): Promise<ApiResponse<Event>> {
    const response = await this.fetch<any>(`/events/${identifier}`);
    if ((response as any).event) {
      return { data: (response as any).event };
    }
    return response;
  }

  // Categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.fetch<Category[]>("/categories");
  }

  // Organizers
  async getOrganizers(): Promise<Organizer[]> {
    const response = await this.fetch<any>("/organizers");
    return (response as any).organizers || [];
  }

  async getOrganizer(id: string): Promise<ApiResponse<Organizer>> {
    const response = await this.fetch<any>(`/organizers/${id}`);
    if ((response as any).organizer) {
      return { data: (response as any).organizer };
    }
    return response;
  }

  // Search events with advanced filtering
  async searchEvents(params: EventSearchParams): Promise<ApiResponse<Event[]>> {
    return this.getEvents(params);
  }
}

export const apiService = new ApiService();
