/**
 * Test fixtures for consistent test data across the application
 */

// Not importing the interfaces from lib/types since we define our own row types here

// Database table row types based on our schema
interface BaseRow {
  id: string;
  created_at: string;
  updated_at?: string;
}

interface CategoryRow extends BaseRow {
  name: string;
  slug: string;
  description: string | null;
}

interface OrganizerRow extends BaseRow {
  user_id: string;
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  website_url: string | null;
  description: string | null;
  stripe_account_id: string | null;
  stripe_account_enabled: boolean;
  verification_status: string;
}

interface EventRow extends BaseRow {
  organizer_id: string;
  category_id: string;
  title: string;
  description: string;
  slug: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location_name: string;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  max_attendees: number | null;
  status: string;
  featured: boolean;
}

interface TicketTypeRow extends BaseRow {
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  max_per_order: number | null;
  sale_start_date: string | null;
  sale_start_time: string | null;
  sale_end_date: string | null;
  sale_end_time: string | null;
}

interface BookingRow extends BaseRow {
  user_id: string;
  event_id: string;
  total_amount: number;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
}

interface BookingItemRow extends BaseRow {
  booking_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface EventImageRow extends BaseRow {
  event_id: string;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  display_order: number;
}

// User fixtures
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockOrganizerUser = {
  id: "organizer-123",
  email: "organizer@example.com",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Category fixtures
export const mockCategory: CategoryRow = {
  id: "cat-1",
  name: "Music",
  slug: "music",
  description: "Music events and concerts",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockCategories: CategoryRow[] = [
  mockCategory,
  {
    id: "cat-2",
    name: "Sports",
    slug: "sports",
    description: "Sports events and tournaments",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "cat-3",
    name: "Technology",
    slug: "technology",
    description: "Tech conferences and meetups",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Organizer fixtures
export const mockOrganizer: OrganizerRow = {
  id: "org-1",
  user_id: "organizer-123",
  business_name: "Amazing Events Co",
  business_email: "contact@amazingevents.com",
  business_phone: "+1234567890",
  business_address: "123 Event St, City, ST 12345",
  website_url: "https://amazingevents.com",
  description: "We create amazing events for everyone",
  stripe_account_id: "acct_test123",
  stripe_account_enabled: true,
  verification_status: "verified",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Event fixtures
export const mockEvent: EventRow = {
  id: "event-1",
  organizer_id: "org-1",
  category_id: "cat-1",
  title: "Summer Music Festival",
  description: "A fantastic summer music festival with great artists",
  slug: "summer-music-festival",
  start_date: "2024-07-15",
  start_time: "19:00:00",
  end_date: "2024-07-15",
  end_time: "23:00:00",
  location_name: "Central Park",
  location_address: "Central Park, New York, NY",
  location_lat: 40.7829,
  location_lng: -73.9654,
  max_attendees: 1000,
  status: "published",
  featured: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockEvents: EventRow[] = [
  mockEvent,
  {
    id: "event-2",
    organizer_id: "org-1",
    category_id: "cat-2",
    title: "Basketball Tournament",
    description: "Annual basketball tournament",
    slug: "basketball-tournament",
    start_date: "2024-08-01",
    start_time: "10:00:00",
    end_date: "2024-08-01",
    end_time: "18:00:00",
    location_name: "Sports Arena",
    location_address: "456 Sports Ave, City, ST",
    location_lat: 40.75,
    location_lng: -73.98,
    max_attendees: 500,
    status: "published",
    featured: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Ticket type fixtures
export const mockTicketType: TicketTypeRow = {
  id: "ticket-1",
  event_id: "event-1",
  name: "General Admission",
  description: "General admission ticket",
  price: 5000, // $50.00 in cents
  quantity_available: 100,
  quantity_sold: 25,
  max_per_order: 4,
  sale_start_date: "2024-01-01",
  sale_start_time: "09:00:00",
  sale_end_date: "2024-07-15",
  sale_end_time: "19:00:00",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockTicketTypes: TicketTypeRow[] = [
  mockTicketType,
  {
    id: "ticket-2",
    event_id: "event-1",
    name: "VIP",
    description: "VIP access with premium perks",
    price: 15000, // $150.00 in cents
    quantity_available: 20,
    quantity_sold: 5,
    max_per_order: 2,
    sale_start_date: "2024-01-01",
    sale_start_time: "09:00:00",
    sale_end_date: "2024-07-15",
    sale_end_time: "19:00:00",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Booking fixtures
export const mockBooking: BookingRow = {
  id: "booking-1",
  user_id: "user-123",
  event_id: "event-1",
  total_amount: 10000, // $100.00 in cents
  status: "confirmed",
  stripe_session_id: "cs_test123",
  stripe_payment_intent_id: "pi_test123",
  attendee_name: "John Doe",
  attendee_email: "john@example.com",
  attendee_phone: "+1234567890",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Booking items fixtures
export const mockBookingItem: BookingItemRow = {
  id: "item-1",
  booking_id: "booking-1",
  ticket_type_id: "ticket-1",
  quantity: 2,
  unit_price: 5000, // $50.00 in cents
  total_price: 10000, // $100.00 in cents
  created_at: "2024-01-01T00:00:00Z",
};

// Event images fixtures
export const mockEventImage: EventImageRow = {
  id: "img-1",
  event_id: "event-1",
  image_url: "/images/events/summer-festival.jpg",
  alt_text: "Summer Music Festival main stage",
  is_primary: true,
  display_order: 1,
  created_at: "2024-01-01T00:00:00Z",
};

// Complex objects with relationships
export const mockEventWithRelations = {
  ...mockEvent,
  organizers: mockOrganizer,
  event_categories: mockCategory,
  event_images: [mockEventImage],
  ticket_types: mockTicketTypes.filter((t) => t.event_id === mockEvent.id),
};

export const mockBookingWithRelations = {
  ...mockBooking,
  events: mockEventWithRelations,
  booking_items: [mockBookingItem],
};

// API response fixtures
export const mockApiResponse = {
  success: true,
  data: null,
  error: null,
};

export const mockApiErrorResponse = {
  success: false,
  data: null,
  error: "Something went wrong",
};

// Stripe fixtures
export const mockStripeSession = {
  id: "cs_test123",
  url: "https://checkout.stripe.com/c/pay/cs_test123",
  amount_total: 10000,
  currency: "usd",
  metadata: {
    bookingId: "booking-1",
    eventId: "event-1",
  },
};

export const mockStripeAccount = {
  id: "acct_test123",
  type: "express",
  country: "US",
  email: "organizer@example.com",
  details_submitted: true,
  charges_enabled: true,
  payouts_enabled: true,
};

// Helper function to create test data variants
export function createMockEvent(overrides: Partial<EventRow> = {}) {
  return { ...mockEvent, ...overrides };
}

export function createMockOrganizer(overrides: Partial<OrganizerRow> = {}) {
  return { ...mockOrganizer, ...overrides };
}

export function createMockBooking(overrides: Partial<BookingRow> = {}) {
  return { ...mockBooking, ...overrides };
}

export function createMockTicketType(overrides: Partial<TicketTypeRow> = {}) {
  return { ...mockTicketType, ...overrides };
}
