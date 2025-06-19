"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Tag, ArrowRight } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiService } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getCategories();

        if (response.error) {
          setError(response.error);
        } else {
          const categoriesData = response.categories || [];
          setCategories(categoriesData);
          setFilteredCategories(categoriesData);
        }
      } catch (err) {
        setError("Failed to fetch categories");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (category.description &&
            category.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
      setFilteredCategories(filtered);
    }
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
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
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
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery
                  ? "No categories found"
                  : "No categories available"}
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? "Try adjusting your search terms."
                  : "Categories will appear here once they are added."}
              </p>
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
                {filteredCategories.map((category) => (
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
        </section>

        {/* Popular Categories Section */}
        {!searchQuery && !loading && filteredCategories.length > 0 && (
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
                {filteredCategories.slice(0, 6).map((category) => (
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
                      <p className="text-xs text-gray-500 mt-1">View events</p>
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
