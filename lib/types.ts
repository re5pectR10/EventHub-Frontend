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
  location_coordinates?: {
    lat: number;
    lng: number;
  };
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
  q?: string; // Alternative query parameter
  category?: string;
  featured?: boolean;
  date_from?: string;
  date_to?: string;
  dateFrom?: string; // Alternative date parameter names
  dateTo?: string; // Alternative date parameter names
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  sort?: "date_asc" | "date_desc" | "price_asc" | "price_desc" | "distance_asc";
  page?: number;
  limit?: number;
}

export interface OrganizerSearchParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface BookingSearchParams {
  search?: string;
  status?: string;
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
  organizer_id?: string;
  ticket_type?: TicketType;
  ticket_types?: TicketType[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
  checkout_url?: string;
  message?: string;
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      booking_items: {
        Row: {
          booking_id: string;
          created_at: string | null;
          id: string;
          quantity: number;
          ticket_type_id: string;
          total_price: number;
          unit_price: number;
          updated_at: string | null;
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          id?: string;
          quantity: number;
          ticket_type_id: string;
          total_price: number;
          unit_price: number;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          id?: string;
          quantity?: number;
          ticket_type_id?: string;
          total_price?: number;
          unit_price?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          created_at: string | null;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          event_id: string;
          id: string;
          payment_intent_id: string | null;
          status: Database["public"]["Enums"]["booking_status"] | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          total_price: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          event_id: string;
          id?: string;
          payment_intent_id?: string | null;
          status?: Database["public"]["Enums"]["booking_status"] | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          total_price: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          event_id?: string;
          id?: string;
          payment_intent_id?: string | null;
          status?: Database["public"]["Enums"]["booking_status"] | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          total_price?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          created_at: string | null;
          id: string;
          stripe_customer_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          stripe_customer_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          stripe_customer_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      event_categories: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      event_images: {
        Row: {
          alt_text: string | null;
          created_at: string | null;
          display_order: number | null;
          event_id: string;
          id: string;
          image_url: string;
          is_primary: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          event_id: string;
          id?: string;
          image_url: string;
          is_primary?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          event_id?: string;
          id?: string;
          image_url?: string;
          is_primary?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          category_id: string;
          created_at: string | null;
          description: string;
          end_date: string;
          end_time: string | null;
          external_ticket_url: string | null;
          external_url: string | null;
          featured: boolean | null;
          id: string;
          location_address: string;
          location_coordinates: unknown | null;
          location_name: string;
          organizer_id: string;
          slug: string;
          source_event_id: string | null;
          source_platform: string | null;
          start_date: string;
          start_time: string;
          status: Database["public"]["Enums"]["event_status"] | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          capacity?: number | null;
          category_id: string;
          created_at?: string | null;
          description: string;
          end_date: string;
          end_time?: string | null;
          external_ticket_url?: string | null;
          external_url?: string | null;
          featured?: boolean | null;
          id?: string;
          location_address: string;
          location_coordinates?: unknown | null;
          location_name: string;
          organizer_id: string;
          slug: string;
          source_event_id?: string | null;
          source_platform?: string | null;
          start_date: string;
          start_time: string;
          status?: Database["public"]["Enums"]["event_status"] | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          capacity?: number | null;
          category_id?: string;
          created_at?: string | null;
          description?: string;
          end_date?: string;
          end_time?: string | null;
          external_ticket_url?: string | null;
          external_url?: string | null;
          featured?: boolean | null;
          id?: string;
          location_address?: string;
          location_coordinates?: unknown | null;
          location_name?: string;
          organizer_id?: string;
          slug?: string;
          source_event_id?: string | null;
          source_platform?: string | null;
          start_date?: string;
          start_time?: string;
          status?: Database["public"]["Enums"]["event_status"] | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "event_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "organizers";
            referencedColumns: ["id"];
          }
        ];
      };
      organizers: {
        Row: {
          business_name: string;
          contact_email: string;
          contact_phone: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          location: string | null;
          logo_url: string | null;
          stripe_account_id: string | null;
          updated_at: string | null;
          user_id: string;
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          website: string | null;
        };
        Insert: {
          business_name: string;
          contact_email: string;
          contact_phone?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          location?: string | null;
          logo_url?: string | null;
          stripe_account_id?: string | null;
          updated_at?: string | null;
          user_id: string;
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          website?: string | null;
        };
        Update: {
          business_name?: string;
          contact_email?: string;
          contact_phone?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          location?: string | null;
          logo_url?: string | null;
          stripe_account_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          website?: string | null;
        };
        Relationships: [];
      };
      prices: {
        Row: {
          active: boolean | null;
          currency: string | null;
          description: string | null;
          id: string;
          interval: string | null;
          interval_count: number | null;
          metadata: Json | null;
          product_id: string | null;
          trial_period_days: number | null;
          type: string | null;
          unit_amount: number | null;
        };
        Insert: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id: string;
          interval?: string | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: string | null;
          unit_amount?: number | null;
        };
        Update: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          interval?: string | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: string | null;
          unit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          active: boolean | null;
          description: string | null;
          id: string;
          image: string | null;
          metadata: Json | null;
          name: string | null;
        };
        Insert: {
          active?: boolean | null;
          description?: string | null;
          id: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          ended_at: string | null;
          id: string;
          metadata: Json | null;
          price_id: string | null;
          quantity: number | null;
          status: string | null;
          trial_end: string | null;
          trial_start: string | null;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: string | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: string | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "prices";
            referencedColumns: ["id"];
          }
        ];
      };
      ticket_types: {
        Row: {
          created_at: string | null;
          description: string | null;
          event_id: string;
          id: string;
          max_per_order: number | null;
          name: string;
          price: number;
          quantity_available: number;
          quantity_sold: number | null;
          sale_end_date: string | null;
          sale_start_date: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          event_id: string;
          id?: string;
          max_per_order?: number | null;
          name: string;
          price: number;
          quantity_available: number;
          quantity_sold?: number | null;
          sale_end_date?: string | null;
          sale_start_date?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          event_id?: string;
          id?: string;
          max_per_order?: number | null;
          name?: string;
          price?: number;
          quantity_available?: number;
          quantity_sold?: number | null;
          sale_end_date?: string | null;
          sale_start_date?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      tickets: {
        Row: {
          booking_id: string;
          created_at: string | null;
          id: string;
          qr_code: string | null;
          scanned_at: string | null;
          status: Database["public"]["Enums"]["ticket_status"] | null;
          ticket_code: string;
          ticket_type_id: string;
          updated_at: string | null;
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          id?: string;
          qr_code?: string | null;
          scanned_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"] | null;
          ticket_code: string;
          ticket_type_id: string;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          id?: string;
          qr_code?: string | null;
          scanned_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"] | null;
          ticket_code?: string;
          ticket_type_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          billing_address: Json | null;
          created_at: string | null;
          full_name: string | null;
          id: string;
          payment_method: Json | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          payment_method?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          payment_method?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown | null;
          f_table_catalog: unknown | null;
          f_table_name: unknown | null;
          f_table_schema: unknown | null;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown | null;
          f_table_catalog: string | null;
          f_table_name: unknown | null;
          f_table_schema: unknown | null;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown | null;
          f_table_catalog?: string | null;
          f_table_name?: unknown | null;
          f_table_schema?: unknown | null;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown | null;
          f_table_catalog?: string | null;
          f_table_name?: unknown | null;
          f_table_schema?: unknown | null;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      increment_ticket_sold: {
        Args: { ticket_type_id: string; quantity: number };
        Returns: undefined;
      };
    };
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled" | "refunded";
      event_status: "draft" | "published" | "cancelled" | "completed";
      ticket_status: "issued" | "scanned" | "cancelled";
      verification_status: "pending" | "verified" | "rejected";
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown | null;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown | null;
      };
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

// Additional specific interface types for complex queries

// Interface for ticket type with nested event and organizer data
interface TicketTypeWithEventOrganizer {
  id: string;
  event_id: string;
  quantity_sold: number;
  events: {
    organizer_id: string;
    organizers: {
      user_id: string;
    };
  } | null;
}

// Interface for full ticket type details with complete event relationship
interface TicketTypeWithEvent {
  id: string;
  created_at: string | null;
  description: string | null;
  event_id: string;
  max_per_order: number | null;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number | null;
  sale_end_date: string | null;
  sale_start_date: string | null;
  updated_at: string | null;
  events: {
    id: string;
    title: string;
    organizer_id: string;
    organizers: {
      user_id: string;
    };
  } | null;
}

export type { TicketTypeWithEventOrganizer, TicketTypeWithEvent };
