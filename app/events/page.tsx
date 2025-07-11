import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { EventsClient } from "@/components/events/events-client";
import { LocationBanner } from "@/components/location/location-banner";
import { apiService } from "@/lib/api";
import type { Category, Event } from "@/lib/types";

// Enable ISR - revalidate every 30 minutes for static content
export const revalidate = 1800;

async function getStaticData(): Promise<{
  events: Event[];
  categories: Category[];
  totalEvents: number;
}> {
  try {
    // Fetch initial events (first page, default sort) for static generation
    const [eventsResponse, categoriesResponse] = await Promise.all([
      apiService.getEvents({
        page: 1,
        limit: 12,
        sort: "date_asc",
      }),
      apiService.getCategories(),
    ]);

    // Handle events response
    if (eventsResponse.error) {
      console.error("Error fetching events:", eventsResponse.error);
      throw new Error(eventsResponse.error);
    }

    // Handle categories response
    if (categoriesResponse.error) {
      console.error("Error fetching categories:", categoriesResponse.error);
      throw new Error(categoriesResponse.error);
    }

    return {
      events: eventsResponse.events || [],
      categories: categoriesResponse.categories || [],
      totalEvents: eventsResponse.pagination?.total || 0,
    };
  } catch (error) {
    console.error("Error in getStaticData:", error);
    return {
      events: [],
      categories: [],
      totalEvents: 0,
    };
  }
}

export async function generateMetadata() {
  return {
    title: "Local Events | Discover Amazing Events Near You",
    description:
      "Discover local events, activities, concerts, workshops, sports events, and more in your area.",
    keywords:
      "local events, activities, concerts, workshops, sports events, community events, entertainment",
    openGraph: {
      title: "Local Events | Discover Amazing Events Near You",
      description:
        "Discover local events, activities, concerts, workshops, sports events, and more.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Local Events",
      description: "Discover amazing events near you",
    },
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await the searchParams in Next.js 15+
  const resolvedSearchParams = await searchParams;

  // Check if this is a search/filter request (requires CSR)
  const hasSearchParams = Object.keys(resolvedSearchParams).length > 0;

  // If there are search params, use pure CSR approach
  if (hasSearchParams) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <LocationBanner />
          <Suspense
            fallback={
              <div className="container mx-auto px-4 py-12">
                <div className="animate-pulse space-y-8">
                  <div className="text-center">
                    <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-96 mx-auto" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-96 bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            <EventsClient mode="csr" searchParams={resolvedSearchParams} />
          </Suspense>
        </main>
        <Footer />
      </div>
    );
  }

  // For initial load without search params, use SSG/ISR data
  const staticData = await getStaticData();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <LocationBanner />
        <Suspense
          fallback={
            <div className="container mx-auto px-4 py-12">
              <div className="animate-pulse space-y-8">
                <div className="text-center">
                  <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-96 mx-auto" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-96 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <EventsClient
            mode="hybrid"
            initialEvents={staticData.events}
            initialCategories={staticData.categories}
            initialTotal={staticData.totalEvents}
            searchParams={resolvedSearchParams}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
