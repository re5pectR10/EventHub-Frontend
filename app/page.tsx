import { Hero } from "@/components/home/hero";
import { FeaturedEvents } from "@/components/home/featured-events";
import { SuggestedEvents } from "@/components/home/suggested-events";
import { CategoryGrid } from "@/components/home/category-grid";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Hero />
        <SuggestedEvents limit={6} />
        <FeaturedEvents />
        <CategoryGrid />
      </main>
      <Footer />
    </div>
  );
}
