import { Header } from "@/components/layout/header";
import { Hero } from "@/components/home/hero";
import { FeaturedEvents } from "@/components/home/featured-events";
import { CategoryGrid } from "@/components/home/category-grid";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturedEvents />
        <CategoryGrid />
      </main>
      <Footer />
    </div>
  );
}
