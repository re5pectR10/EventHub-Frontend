import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { CategoriesClient } from "@/components/categories/categories-client";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import type { Category } from "@/lib/types";

// Enable ISR - revalidate every 1 hour
export const revalidate = 3600;

async function getCategories(): Promise<Category[]> {
  try {
    const supabaseServer = await getServerSupabaseClient();
    const { data: categories, error } = await supabaseServer
      .from("event_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return categories || [];
  } catch (error) {
    console.error("Categories fetch error:", error);
    return [];
  }
}

export async function generateMetadata() {
  const categories = await getCategories();

  return {
    title: "Event Categories | Discover Events by Category",
    description: `Explore ${categories.length} event categories and find exactly what interests you. Browse music, sports, art, technology, and more.`,
    keywords:
      "event categories, events, activities, music events, sports events, art events, technology events",
    openGraph: {
      title: "Event Categories | Discover Events by Category",
      description: `Explore ${categories.length} event categories and find exactly what interests you.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Event Categories | Discover Events by Category",
      description: `Explore ${categories.length} event categories and find exactly what interests you.`,
    },
  };
}

function CategoriesLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section Skeleton */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container-clean">
            <div className="max-w-3xl mx-auto text-center">
              <div className="h-10 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mx-auto mb-8 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded w-80 mx-auto animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Categories Grid Skeleton */}
        <section className="container-clean py-12">
          <div className="mb-8">
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-32 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  if (categories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
            <div className="container-clean">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Event Categories
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Explore events by category and find exactly what interests you
                </p>
              </div>
            </div>
          </section>

          <section className="container-clean py-12">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No categories available
              </h3>
              <p className="text-gray-600">
                Categories will appear here once they are added.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Suspense fallback={<CategoriesLoading />}>
          <CategoriesClient categories={categories} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
