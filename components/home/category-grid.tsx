"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import type { Category } from "@/lib/types";

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await apiService.getCategories();
        if (response.error) {
          throw new Error(response.error);
        }
        setCategories(response.categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="section-clean bg-secondary/30">
        <div className="container-clean">
          <h2 className="text-center mb-16">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card-clean text-center animate-pulse">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section-clean bg-secondary/30">
        <div className="container-clean text-center">
          <h2 className="mb-8">Browse by Category</h2>
          <p className="text-destructive">Error loading categories: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-clean bg-secondary/30">
      <div className="container-clean">
        <div className="text-center mb-16">
          <h2 className="mb-6">Browse by Category</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find events that match your interests. Whether you're looking for
            educational workshops, entertainment, or community gatherings, we
            have something for everyone.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No categories available at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/events?category=${category.id}`}
                className="group card-clean text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  🎯
                </div>

                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
                  {category.name}
                </h3>

                {category.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {category.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <Button className="btn-clean btn-secondary" asChild>
            <Link href="/events">View All Events</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
