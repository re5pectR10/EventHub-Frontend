import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container-clean section-clean">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section - Simplified */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <span className="text-2xl font-bold">EventHub</span>
            </div>
            <p className="text-background/70 mb-6 leading-relaxed">
              Discover and attend amazing local events in your community.
              Connect with like-minded people and create unforgettable
              experiences.
            </p>
          </div>

          {/* Quick Links - Cleaner */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/events"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/organizers"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  Organizers
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Support - Cleaner */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-background/70 hover:text-background transition-colors duration-200"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info - Cleaner */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-center text-background/70">
                <Mail className="w-4 h-4 mr-3 text-background" />
                <span>hello@eventhub.com</span>
              </div>
              <div className="flex items-center text-background/70">
                <Phone className="w-4 h-4 mr-3 text-background" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-start text-background/70">
                <MapPin className="w-4 h-4 mr-3 mt-1 text-background" />
                <span>
                  123 Event Street
                  <br />
                  Community City, CC 12345
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Simplified */}
        <div className="border-t border-background/20 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-background/70 text-sm">
            © {new Date().getFullYear()} EventHub. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link
              href="/privacy"
              className="text-background/70 hover:text-background text-sm transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-background/70 hover:text-background text-sm transition-colors duration-200"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
