"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Tag, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import { toast } from "@/lib/notifications";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories using React Query
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiService.getCategories();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.categories || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (searchQuery.trim() === "") {
      return categories;
    }

    const query = searchQuery.toLowerCase();
    return categories.filter(
      (category: Category) =>
        category.name.toLowerCase().includes(query) ||
        (category.description &&
          category.description.toLowerCase().includes(query))
    );
  }, [searchQuery, categories]);

  // Mock category icons - in a real app, these would come from the database
  const getCategoryIcon = (categoryName: string) => {
    const iconMap: { [key: string]: string } = {
      music: "🎵",
      sports: "⚽",
      food: "🍽️",
      art: "🎨",
      technology: "💻",
      business: "💼",
      health: "🏥",
      education: "📚",
      entertainment: "🎭",
      community: "👥",
      outdoor: "🌲",
      family: "👨‍👩‍👧‍👦",
      workshop: "🔧",
      conference: "🎤",
      festival: "🎪",
      charity: "❤️",
      networking: "🤝",
      fitness: "💪",
      travel: "✈️",
      photography: "📸",
    };

    const key = categoryName.toLowerCase();
    return iconMap[key] || "📅";
  };

  const handleRetry = () => {
    refetch();
    toast.success("Refreshing categories...");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container-clean">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Event Categories
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Explore events by category and find exactly what interests you
              </p>

              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="container-clean py-12">
          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to Load Categories
              </h3>
              <p className="text-gray-600 mb-6">
                {error instanceof Error
                  ? error.message
                  : "Something went wrong while loading categories."}
              </p>
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !error && (
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
          )}

          {/* Content */}
          {!isLoading && !error && (
            <>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery
                      ? "No categories found"
                      : "No categories available"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery
                      ? "Try adjusting your search terms."
                      : "Categories will appear here once they are added."}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Results count */}
                  <div className="mb-8">
                    <p className="text-gray-600">
                      {searchQuery
                        ? `${filteredCategories.length} categories found for "${searchQuery}"`
                        : `${filteredCategories.length} categories available`}
                    </p>
                  </div>

                  {/* Categories Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCategories.map((category: Category) => (
                      <Link
                        key={category.id}
                        href={`/events?category=${category.id}`}
                      >
                        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 h-full">
                          <CardHeader className="text-center pb-4">
                            <div className="text-4xl mb-3">
                              {getCategoryIcon(category.name)}
                            </div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {category.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {category.description && (
                              <p className="text-sm text-gray-600 text-center mb-4 line-clamp-3">
                                {category.description}
                              </p>
                            )}
                            <div className="flex items-center justify-center text-sm text-primary group-hover:text-primary-dark transition-colors">
                              <span>Browse Events</span>
                              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* Popular Categories Section */}
        {!searchQuery &&
          !isLoading &&
          !error &&
          filteredCategories.length > 0 && (
            <section className="bg-gray-50 py-12">
              <div className="container-clean">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Popular Categories
                  </h2>
                  <p className="text-gray-600">
                    Most searched event categories this month
                  </p>
                </div>

                {/* This would typically show categories with event counts */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredCategories.slice(0, 6).map((category: Category) => (
                    <Link
                      key={`popular-${category.id}`}
                      href={`/events?category=${category.id}`}
                      className="group"
                    >
                      <div className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                        <div className="text-2xl mb-2">
                          {getCategoryIcon(category.name)}
                        </div>
                        <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        {/* In a real app, you'd show event count here */}
                        <p className="text-xs text-gray-500 mt-1">
                          View events
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
      </main>

      <Footer />
    </div>
  );
}
