import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="section-clean bg-gradient-to-b from-background to-secondary/30">
      <div className="container-clean">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main heading - Simplified */}
          <h1 className="mb-6">
            Discover Amazing <span className="text-primary">Local Events</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Find workshops, concerts, food experiences, and more happening right
            in your neighborhood. Book tickets instantly and support your local
            community.
          </p>

          {/* Clean Search Form */}
          <div className="card-clean max-w-4xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    placeholder="What are you looking for?"
                    className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Where?"
                    className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <Button className="w-full py-4 btn-clean btn-primary text-base font-medium">
                  Search
                </Button>
              </div>
            </div>
          </div>

          {/* Clean Stats - Simplified */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-3xl mx-auto mb-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Events This Month</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Local Organizers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Happy Attendees</div>
            </div>
          </div>

          {/* Organizer CTA */}
          <div className="card-clean bg-primary/5 border-primary/20">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Are you an event organizer?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join our platform and start creating amazing events. Manage
                bookings, track sales, and connect with your audience all in one
                place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="btn-clean btn-primary">
                  <Link href="/dashboard">Get Started</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/organizers">View Organizers</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
