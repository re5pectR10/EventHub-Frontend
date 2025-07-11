import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

// Types for the nearby events functionality
interface Coordinates {
  lat: number;
  lng: number;
}

// Validation schema for nearby events query parameters
const NearbyEventsQuerySchema = z.object({
  latitude: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= -90 && val <= 90, {
      message: "Latitude must be a valid number between -90 and 90",
    }),
  longitude: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= -180 && val <= 180, {
      message: "Longitude must be a valid number between -180 and 180",
    }),
  radius: z
    .string()
    .optional()
    .default("50000")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 200000, {
      message: "Radius must be a positive number up to 200000 meters (200km)",
    }),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Page must be a positive number",
    }),
  category: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Helper function to convert geography column to coordinates object
function parseLocationToCoordinates(location: unknown): Coordinates | null {
  if (!location) return null;

  try {
    // Handle different location formats that might come from PostGIS
    if (typeof location === "string") {
      // Parse PostGIS geography string format
      const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
      if (match) {
        return {
          lat: parseFloat(match[2]),
          lng: parseFloat(match[1]),
        };
      }
    } else if (location && typeof location === "object") {
      // Handle if it's already parsed as an object with proper type guards
      if (
        "lat" in location &&
        "lng" in location &&
        typeof location.lat === "number" &&
        typeof location.lng === "number"
      ) {
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }
      if (
        "latitude" in location &&
        "longitude" in location &&
        typeof location.latitude === "number" &&
        typeof location.longitude === "number"
      ) {
        return {
          lat: location.latitude,
          lng: location.longitude,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing location:", error);
    return null;
  }
}

// GET /api/events/nearby - Get events near specific coordinates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate query parameters
    const queryParams = {
      latitude: searchParams.get("latitude"),
      longitude: searchParams.get("longitude"),
      radius: searchParams.get("radius"),
      limit: searchParams.get("limit"),
      page: searchParams.get("page"),
      category: searchParams.get("category"),
      search: searchParams.get("search"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    };

    // Remove null values for proper validation
    const cleanedParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, value]) => value !== null)
    );

    // Validate required parameters
    if (!queryParams.latitude || !queryParams.longitude) {
      return NextResponse.json(
        { error: "Both latitude and longitude parameters are required" },
        { status: 400 }
      );
    }

    const validatedQuery = NearbyEventsQuerySchema.parse(cleanedParams);
    const offset = (validatedQuery.page - 1) * validatedQuery.limit;

    const supabaseServer = await getServerSupabaseClient();

    // Call the nearby_events SQL function
    const { data: nearbyResults, error: nearbyError } =
      await supabaseServer.rpc("nearby_events", {
        lat: validatedQuery.latitude,
        lon: validatedQuery.longitude,
        radius_meters: validatedQuery.radius,
        limit_count: validatedQuery.limit,
        offset_count: offset,
      });

    if (nearbyError) {
      console.error("Nearby events function error:", nearbyError);
      return NextResponse.json(
        { error: `Failed to fetch nearby events: ${nearbyError.message}` },
        { status: 500 }
      );
    }

    if (!nearbyResults || nearbyResults.length === 0) {
      return NextResponse.json({
        events: [],
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        search: {
          latitude: validatedQuery.latitude,
          longitude: validatedQuery.longitude,
          radius: validatedQuery.radius,
        },
      });
    }

    // Type the nearby results
    interface NearbyEventRecord {
      id: string;
      title: string;
      description: string;
      slug: string;
      start_date: string;
      start_time: string;
      end_date: string;
      end_time: string | null;
      location_name: string;
      location_address: string;
      location: unknown;
      category_id: string;
      organizer_id: string;
      status: string;
      featured: boolean;
      capacity: number | null;
      created_at: string;
      updated_at: string;
      distance_meters: number;
    }

    const typedNearbyResults = nearbyResults as NearbyEventRecord[];

    // Get the event IDs to fetch related data
    const eventIds = typedNearbyResults.map((event) => event.id);

    // Fetch complete event data with relations
    const { data: eventsWithRelations, error: relationsError } =
      await supabaseServer
        .from("events")
        .select(
          `
        id,
        title,
        description,
        slug,
        start_date,
        start_time,
        end_date,
        end_time,
        location_name,
        location_address,
        location,
        category_id,
        organizer_id,
        status,
        featured,
        capacity,
        created_at,
        updated_at,
        organizers(id, business_name, contact_email, description, website),
        event_categories(name, slug),
        event_images(image_url, alt_text, display_order, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
        )
        .in("id", eventIds);

    if (relationsError) {
      console.error("Relations fetch error:", relationsError);
      return NextResponse.json(
        { error: `Failed to fetch event details: ${relationsError.message}` },
        { status: 500 }
      );
    }

    // Type guard for event data
    interface EventRecord {
      id: string;
      title: string;
      description: string;
      slug: string;
      start_date: string;
      start_time: string;
      end_date: string;
      end_time: string | null;
      location_name: string;
      location_address: string;
      location: unknown;
      category_id: string;
      organizer_id: string;
      status: string;
      featured: boolean;
      capacity: number | null;
      created_at: string;
      updated_at: string;
      organizers: {
        id: string;
        business_name: string;
        contact_email: string;
        description: string | null;
        website: string | null;
      }[];
      event_categories: {
        name: string;
        slug: string;
      }[];
      event_images: {
        image_url: string;
        alt_text: string | null;
        display_order: number | null;
        is_primary: boolean | null;
      }[];
      ticket_types: {
        id: string;
        name: string;
        price: number;
        quantity_available: number;
        quantity_sold: number;
      }[];
    }

    const typedEventsWithRelations = (eventsWithRelations ||
      []) as EventRecord[];

    // Merge distance data with event relations, maintaining order
    const enrichedEvents = typedNearbyResults.map((nearbyEvent) => {
      const eventWithRelations = typedEventsWithRelations.find(
        (e) => e.id === nearbyEvent.id
      );

      if (!eventWithRelations) {
        console.warn(
          `Event with ID ${nearbyEvent.id} not found in relations data`
        );
        return {
          ...nearbyEvent,
          location_coordinates: parseLocationToCoordinates(
            nearbyEvent.location
          ),
          distance_meters: nearbyEvent.distance_meters,
        };
      }

      return {
        ...eventWithRelations,
        location_coordinates: parseLocationToCoordinates(
          eventWithRelations.location
        ),
        distance_meters: nearbyEvent.distance_meters,
      };
    });

    // Apply additional filters if specified
    let filteredEvents = enrichedEvents;

    if (validatedQuery.category) {
      filteredEvents = filteredEvents.filter((event) =>
        (event as EventRecord).event_categories?.some(
          (cat: { slug: string }) => cat.slug === validatedQuery.category
        )
      );
    }

    if (validatedQuery.search) {
      const searchLower = validatedQuery.search.toLowerCase();
      filteredEvents = filteredEvents.filter(
        (event) =>
          event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.location_name?.toLowerCase().includes(searchLower)
      );
    }

    if (validatedQuery.dateFrom) {
      filteredEvents = filteredEvents.filter(
        (event) => event.start_date >= validatedQuery.dateFrom!
      );
    }

    if (validatedQuery.dateTo) {
      filteredEvents = filteredEvents.filter(
        (event) => event.start_date <= validatedQuery.dateTo!
      );
    }

    // Calculate pagination info
    const total = filteredEvents.length;
    const totalPages = Math.ceil(total / validatedQuery.limit);

    const response = {
      events: filteredEvents,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        totalPages,
        hasNextPage: validatedQuery.page < totalPages,
        hasPreviousPage: validatedQuery.page > 1,
      },
      search: {
        latitude: validatedQuery.latitude,
        longitude: validatedQuery.longitude,
        radius: validatedQuery.radius,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Nearby events API error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch nearby events" },
      { status: 500 }
    );
  }
}
