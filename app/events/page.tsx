import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { EventsClient } from "@/components/events/events-client";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import type { Category, Event } from "@/lib/types";

// Enable ISR - revalidate every 30 minutes
export const revalidate = 1800;

async function getInitialData(): Promise<{
  events: Event[];
  categories: Category[];
  totalEvents: number;
}> {
  try {
    const supabaseServer = await getServerSupabaseClient();

    // Fetch initial events (first page, default sort)
    const { data: events, error: eventsError } = await supabaseServer
      .from("events")
      .select(
        `
        *,
        organizers(id, business_name, contact_email, description, website),
        event_categories(name, slug),
        event_images(image_url, alt_text, display_order, is_primary),
        ticket_types(id, name, price, quantity_available, quantity_sold)
      `
      )
      .eq("status", "published")
      .order("start_date", { ascending: true })
      .range(0, 11); // First 12 events

    // Fetch all categories for filtering
    const { data: categories, error: categoriesError } = await supabaseServer
      .from("event_categories")
      .select("*")
      .order("name", { ascending: true });

    // Get total count of published events
    const { count: totalEvents, error: countError } = await supabaseServer
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    if (eventsError) {
      console.error("Events fetch error:", eventsError);
    }
    if (categoriesError) {
      console.error("Categories fetch error:", categoriesError);
    }
    if (countError) {
      console.error("Count fetch error:", countError);
    }

    return {
      events: events || [],
      categories: categories || [],
      totalEvents: totalEvents || 0,
    };
  } catch (error) {
    console.error("Data fetch error:", error);
    return {
      events: [],
      categories: [],
      totalEvents: 0,
    };
  }
}

export async function generateMetadata() {
  const { events, categories } = await getInitialData();

  const categoryNames = categories
    .slice(0, 5)
    .map((cat) => cat.name)
    .join(", ");

  return {
    title: "Local Events | Discover Amazing Events Near You",
    description: `Discover ${events.length}+ local events. Browse ${categories.length} categories including ${categoryNames}. Find concerts, workshops, sports events, and more.`,
    keywords:
      "local events, activities, concerts, workshops, sports events, community events, entertainment",
    openGraph: {
      title: "Local Events | Discover Amazing Events Near You",
      description: `Discover ${events.length}+ local events across ${categories.length} categories.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Local Events | Discover Amazing Events Near You",
      description: `Discover ${events.length}+ local events across ${categories.length} categories.`,
    },
  };
}

function EventsLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section Skeleton */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container-clean">
            <div className="max-w-3xl mx-auto text-center">
              <div className="h-10 bg-gray-200 rounded w-80 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mx-auto mb-8 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded w-full max-w-2xl mx-auto animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Controls Skeleton */}
        <section className="border-b bg-white py-4">
          <div className="container-clean">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Events Grid Skeleton */}
        <section className="py-8">
          <div className="container-clean">
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="border rounded-lg overflow-hidden animate-pulse"
                >
                  <div className="bg-gray-200 h-48"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2 w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default async function EventsPage() {
  const { events, categories, totalEvents } = await getInitialData();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Suspense fallback={<EventsLoading />}>
          <EventsClient
            initialEvents={events}
            initialCategories={categories}
            totalInitialEvents={totalEvents}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
