// Centralized types for the booking application
// This file contains all shared interfaces and types

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
  ticket_types: TicketType[];
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  is_active?: boolean;
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
  stripe_account_id?: string;
  verification_status?: "pending" | "verified" | "rejected";
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
    slug?: string;
    start_date: string;
    start_time: string;
    end_time?: string;
    location_name: string;
    location_address?: string;
  };
  booking_items: Array<{
    id?: string;
    ticket_type_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    ticket_types: {
      id: string;
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

// Form-specific interfaces
export interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location_name: string;
  location_address: string;
  category_id: string;
  capacity: number;
  featured: boolean;
  status: "draft" | "published" | "cancelled";
}

export interface TicketSelection {
  ticket_type_id: string;
  quantity: number;
}

export interface TicketTypeFormData {
  id?: string;
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  sale_start_date?: string;
  sale_end_date?: string;
  max_per_order?: number;
  is_active?: boolean;
}

export interface BookingSummary {
  totalBookings: number;
  totalRevenue: number;
  totalTicketsSold: number;
  pendingBookings: number;
}

export interface BookingDetails extends Omit<Booking, "events"> {
  // Additional fields specific to detailed booking view
  qr_codes?: string[];
  event_details?: Partial<Event>;
  events: {
    title: string;
    start_date: string;
    start_time: string;
    end_date?: string;
    end_time?: string;
    location_name: string;
    location_address?: string;
  };
}

// Search and filter types
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

// todo: choose between generic data and hardcoded types
// API Response types
export interface ApiResponse<T> {
  data?: T;
  event?: Event;
  events?: Event[];
  categories?: Category[];
  bookings?: Booking[];
  booking?: Booking;
  organizer?: Organizer;
  ticket_types?: TicketType[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
  checkout_url?: string;
}

// Component prop types
export interface EventCardProps {
  event: Event;
  showOrganizer?: boolean;
  className?: string;
}

// Utility types
export type EventStatus = Event["status"];
export type BookingStatus = Booking["status"];
export type SortOrder = EventSearchParams["sort"];
