-- Migration: Enhance events table for location-aware event discovery
-- This migration converts the existing POINT column to geography(Point, 4326) for better spatial queries
-- and creates a PostgreSQL function for efficient nearby events search

-- Step 1: Add new geography column for location data
ALTER TABLE events ADD COLUMN location geography(Point, 4326);

-- Step 2: Copy existing location_coordinates data to the new geography column
-- Convert POINT to geography format
UPDATE events 
SET location = ST_SetSRID(location_coordinates, 4326)::geography 
WHERE location_coordinates IS NOT NULL;

-- Step 3: Drop the old spatial index and create a new one for the geography column
DROP INDEX IF EXISTS idx_events_location;
CREATE INDEX events_location_idx ON events USING GIST (location);

-- Step 4: Create function for efficient nearby events search
-- This function accepts latitude, longitude, and radius in meters
-- Returns events within the specified radius, sorted by distance
CREATE OR REPLACE FUNCTION nearby_events(
  lat DECIMAL,
  lon DECIMAL,
  radius_meters INTEGER DEFAULT 50000,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  description TEXT,
  slug VARCHAR(255),
  start_date DATE,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  location_name VARCHAR(255),
  location_address TEXT,
  location geography(Point, 4326),
  category_id UUID,
  organizer_id UUID,
  status event_status,
  featured BOOLEAN,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  distance_meters REAL
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    e.id,
    e.title,
    e.description,
    e.slug,
    e.start_date,
    e.start_time,
    e.end_date,
    e.end_time,
    e.location_name,
    e.location_address,
    e.location,
    e.category_id,
    e.organizer_id,
    e.status,
    e.featured,
    e.capacity,
    e.created_at,
    e.updated_at,
    ST_Distance(e.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography)::REAL as distance_meters
  FROM events e
  WHERE 
    e.status = 'published'
    AND e.location IS NOT NULL
    AND ST_DWithin(e.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_meters)
  ORDER BY distance_meters ASC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Step 5: Grant necessary permissions for the function
GRANT EXECUTE ON FUNCTION nearby_events TO authenticated;
GRANT EXECUTE ON FUNCTION nearby_events TO anon;

-- Step 6: Create helper function to convert coordinates for API responses
CREATE OR REPLACE FUNCTION location_to_coordinates(loc geography)
RETURNS JSON
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN loc IS NOT NULL THEN
        json_build_object(
          'lat', ST_Y(loc::geometry),
          'lng', ST_X(loc::geometry)
        )
      ELSE NULL
    END;
$$;

-- Step 7: Create an index on the status column for better performance in nearby_events function
CREATE INDEX IF NOT EXISTS idx_events_status_location ON events(status) WHERE status = 'published';

-- Step 8: Add a comment to document the purpose of the new column
COMMENT ON COLUMN events.location IS 'Geography point (SRID 4326) storing longitude and latitude for spatial queries';
COMMENT ON FUNCTION nearby_events IS 'Returns published events within specified radius from given coordinates, sorted by distance';

-- Step 9: Update the RLS policies to include the new location column
-- The existing policies should automatically apply to the new column, but we'll ensure they're working correctly

-- Add a check constraint to ensure valid geography data
ALTER TABLE events ADD CONSTRAINT check_location_valid 
  CHECK (location IS NULL OR ST_IsValid(location::geometry));

-- Step 10: Create a trigger to auto-populate location from location_coordinates if needed
CREATE OR REPLACE FUNCTION sync_location_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  -- If location_coordinates is updated but location is not, sync it
  IF NEW.location_coordinates IS NOT NULL AND NEW.location IS NULL THEN
    NEW.location = ST_SetSRID(NEW.location_coordinates, 4326)::geography;
  END IF;
  
  -- If location is updated, we can optionally sync back to location_coordinates
  -- This maintains backward compatibility
  IF NEW.location IS NOT NULL THEN
    NEW.location_coordinates = NEW.location::geometry::point;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_location_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION sync_location_coordinates(); 