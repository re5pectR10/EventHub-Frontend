-- Current Database Schema (Generated from Supabase DB)
-- This file is for versioning purposes only - DO NOT APPLY

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Custom types
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE ticket_status AS ENUM ('issued', 'scanned', 'cancelled');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Event Categories Table
CREATE TABLE event_categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name varchar NOT NULL UNIQUE,
    slug varchar NOT NULL UNIQUE,
    description text,
    icon varchar,
    color varchar CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Organizers Table  
CREATE TABLE organizers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
    business_name varchar NOT NULL,
    contact_email varchar NOT NULL,
    contact_phone varchar,
    description text,
    website varchar,
    stripe_account_id varchar,
    verification_status verification_status DEFAULT 'pending',
    location text,
    logo_url text
);

-- Events Table
CREATE TABLE events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    organizer_id uuid NOT NULL REFERENCES organizers(id),
    title varchar NOT NULL,
    description text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    start_time time NOT NULL,
    end_time time,
    location_name varchar NOT NULL,
    location_address text NOT NULL,
    location_coordinates point,
    location geography(Point, 4326),
    category_id uuid NOT NULL REFERENCES event_categories(id),
    status event_status DEFAULT 'draft',
    capacity integer CHECK (capacity > 0),
    featured boolean DEFAULT false,
    slug varchar NOT NULL UNIQUE,
    source_platform text,
    source_event_id text,
    external_url text,
    external_ticket_url text,
    CONSTRAINT check_location_valid CHECK (location IS NULL OR ST_IsValid(location::geometry))
);

-- Event Images Table
CREATE TABLE event_images (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    event_id uuid NOT NULL REFERENCES events(id),
    image_url text NOT NULL,
    alt_text varchar,
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

-- Ticket Types Table
CREATE TABLE ticket_types (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    event_id uuid NOT NULL REFERENCES events(id),
    name varchar NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    quantity_available integer NOT NULL CHECK (quantity_available >= 0),
    quantity_sold integer DEFAULT 0 CHECK (quantity_sold >= 0),
    sale_start_date timestamptz,
    sale_end_date timestamptz,
    max_per_order integer CHECK (max_per_order > 0),
    updated_at timestamptz DEFAULT now()
);

-- Bookings Table  
CREATE TABLE bookings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    event_id uuid NOT NULL REFERENCES events(id),
    total_price numeric NOT NULL CHECK (total_price >= 0),
    status booking_status DEFAULT 'pending',
    payment_intent_id varchar,
    stripe_checkout_session_id varchar,
    customer_name varchar NOT NULL,
    customer_email varchar NOT NULL,
    customer_phone varchar,
    stripe_session_id text,
    stripe_payment_intent_id text
);

-- Booking Items Table
CREATE TABLE booking_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid NOT NULL REFERENCES bookings(id),
    ticket_type_id uuid NOT NULL REFERENCES ticket_types(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric NOT NULL CHECK (unit_price >= 0),
    total_price numeric NOT NULL CHECK (total_price >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tickets Table
CREATE TABLE tickets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    booking_id uuid NOT NULL REFERENCES bookings(id),
    ticket_type_id uuid NOT NULL REFERENCES ticket_types(id),
    ticket_code varchar NOT NULL UNIQUE,
    qr_code text,
    status ticket_status DEFAULT 'issued',
    scanned_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Users Table (extends auth.users)
CREATE TABLE users (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    full_name text,
    avatar_url text,
    billing_address jsonb,
    payment_method jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Stripe Integration Tables
CREATE TABLE customers (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    stripe_customer_id text UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE products (
    id text PRIMARY KEY,
    active boolean,
    name text,
    description text,
    image text,
    metadata jsonb
);

CREATE TABLE prices (
    id text PRIMARY KEY,
    product_id text REFERENCES products(id),
    active boolean,
    description text,
    unit_amount bigint,
    currency text CHECK (char_length(currency) = 3),
    type text CHECK (type = ANY (ARRAY['one_time', 'recurring'])),
    interval text CHECK (interval = ANY (ARRAY['month', 'year'])),
    interval_count integer,
    trial_period_days integer,
    metadata jsonb
);

CREATE TABLE subscriptions (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    status text CHECK (status = ANY (ARRAY['trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused'])),
    metadata jsonb,
    price_id text REFERENCES prices(id),
    quantity integer,
    cancel_at_period_end boolean,
    created timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    current_period_start timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    current_period_end timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    ended_at timestamp with time zone DEFAULT timezone('utc', now()),
    cancel_at timestamp with time zone DEFAULT timezone('utc', now()),
    canceled_at timestamp with time zone DEFAULT timezone('utc', now()),
    trial_start timestamp with time zone DEFAULT timezone('utc', now()),
    trial_end timestamp with time zone DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX events_location_idx ON events USING GIST (location);
CREATE INDEX events_organizer_id_idx ON events(organizer_id);
CREATE INDEX events_category_id_idx ON events(category_id);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_featured_idx ON events(featured);
CREATE INDEX events_start_date_idx ON events(start_date);
CREATE INDEX bookings_user_id_idx ON bookings(user_id);
CREATE INDEX bookings_event_id_idx ON bookings(event_id);

-- Functions
CREATE OR REPLACE FUNCTION sync_location_coordinates()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.location_coordinates IS DISTINCT FROM NEW.location_coordinates) THEN
    IF NEW.location_coordinates IS NOT NULL THEN
      NEW.location = ST_GeogFromText('POINT(' || NEW.location_coordinates[0] || ' ' || NEW.location_coordinates[1] || ')');
    ELSE
      NEW.location = NULL;
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.location_coordinates IS NOT NULL THEN
    NEW.location = ST_GeogFromText('POINT(' || NEW.location_coordinates[0] || ' ' || NEW.location_coordinates[1] || ')');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_location_to_coordinates()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.location IS DISTINCT FROM NEW.location) THEN
    IF NEW.location IS NOT NULL THEN
      NEW.location_coordinates = POINT(ST_X(NEW.location::geometry), ST_Y(NEW.location::geometry));
    ELSE
      NEW.location_coordinates = NULL;
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.location IS NOT NULL THEN
    NEW.location_coordinates = POINT(ST_X(NEW.location::geometry), ST_Y(NEW.location::geometry));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION nearby_events(
  lat double precision,
  lon double precision,
  radius_meters integer DEFAULT 50000,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title varchar,
  description text,
  slug varchar,
  start_date date,
  start_time time,
  end_date date,
  end_time time,
  location_name varchar,
  location_address text,
  location_coordinates point,
  location geography,
  status text,
  featured boolean,
  created_at timestamptz,
  updated_at timestamptz,
  organizer_id uuid,
  category_id uuid,
  capacity integer,
  distance_meters double precision
) 
LANGUAGE sql STABLE
AS $$
  SELECT 
    e.id, e.title, e.description, e.slug, e.start_date, e.start_time,
    e.end_date, e.end_time, e.location_name, e.location_address,
    e.location_coordinates, e.location, e.status::text, e.featured,
    e.created_at, e.updated_at, e.organizer_id, e.category_id, e.capacity,
    ST_Distance(e.location, ST_GeogFromText('POINT(' || lon || ' ' || lat || ')')) as distance_meters
  FROM events e
  WHERE 
    e.status = 'published'
    AND e.location IS NOT NULL
    AND ST_DWithin(e.location, ST_GeogFromText('POINT(' || lon || ' ' || lat || ')'), radius_meters)
  ORDER BY distance_meters ASC
  LIMIT limit_count OFFSET offset_count;
$$;

CREATE OR REPLACE FUNCTION increment_ticket_sold(ticket_type_id uuid, quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE ticket_types 
  SET quantity_sold = quantity_sold + quantity
  WHERE id = ticket_type_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER sync_location_coordinates_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION sync_location_coordinates();

CREATE TRIGGER sync_location_to_coordinates_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION sync_location_to_coordinates();

-- Grants
GRANT EXECUTE ON FUNCTION nearby_events TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_ticket_sold TO authenticated, anon; 