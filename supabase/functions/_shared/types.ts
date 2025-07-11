// Shared types for Supabase Edge Functions
import type { Context } from "jsr:@hono/hono";
import type { SupabaseClient, User } from "jsr:@supabase/supabase-js@2";

// Hono Context type
export type HonoContext = Context;

// Supabase types
export type { User, SupabaseClient };

// Database table interfaces
export interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location_name: string;
  location_address: string;
  location_coordinates?: string;
  category_id: string;
  organizer_id: string;
  status: "draft" | "published" | "cancelled";
  featured: boolean;
  capacity?: number;
  created_at: string;
  updated_at: string;
}

export interface Organizer {
  id: string;
  user_id: string;
  business_name: string;
  description?: string;
  contact_email: string;
  website?: string;
  logo_url?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  status: "pending" | "confirmed" | "cancelled";
  total_price: number;
  payment_intent_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  booking_id: string;
  booking_item_id: string;
  ticket_code: string;
  qr_code: string;
  status: "active" | "used" | "cancelled";
  scanned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EventImage {
  id: string;
  event_id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// Request/Response interfaces
export interface CreateEventRequest {
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location_name: string;
  location_address: string;
  category_id: string;
  featured?: boolean;
  capacity?: number;
  ticket_types: CreateTicketTypeRequest[];
}

export interface CreateTicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
}

export interface CreateBookingRequest {
  event_id: string;
  items: BookingItemRequest[];
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
}

export interface BookingItemRequest {
  ticket_type_id: string;
  quantity: number;
}

export interface CreateOrganizerRequest {
  business_name: string;
  description?: string;
  contact_email: string;
  website?: string;
  logo_url?: string;
  location?: string;
}

// Stripe webhook types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface StripeCheckoutSession {
  id: string;
  payment_intent: string;
  amount_total: number;
  customer_email?: string;
  customer_details?: {
    email?: string;
    name?: string;
  };
  metadata?: {
    booking_id?: string;
    event_id?: string;
    tickets?: string;
    [key: string]: string | undefined;
  };
}

export interface StripePaymentIntent {
  id: string;
  status: string;
  last_payment_error?: any;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Query parameter types
export interface EventsQueryParams {
  query?: string;
  category?: string;
  featured?: string;
  date_from?: string;
  date_to?: string;
  location?: string;
  sort?: "date_asc" | "date_desc" | "price_asc" | "price_desc";
  page?: string;
  limit?: string;
}

// Helper function types
export type AuthHeaderParser = (
  authHeader: string | undefined
) => Promise<User | null>;
export type ErrorHandler = (error: unknown, context: string) => void;
