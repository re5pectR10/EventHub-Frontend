"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth, useAuthActions } from "@/lib/stores/auth-store";
import Image from "next/image";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="container-clean">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo - Always visible with responsive sizing */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/assets/logo/next1ntown-light.svg"
              alt="Next1nTown"
              width={140}
              height={32}
              className="h-6 w-auto sm:h-8 dark:hidden"
              priority
            />
            <Image
              src="/assets/logo/next1ntown-dark.svg"
              alt="Next1nTown"
              width={140}
              height={32}
              className="h-6 w-auto sm:h-8 hidden dark:block"
              priority
            />
          </Link>

          {/* Desktop Navigation - Responsive spacing */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
            <Link
              href="/events"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap"
            >
              Events
            </Link>
            <Link
              href="/categories"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap"
            >
              Categories
            </Link>
            <Link
              href="/organizers"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap"
            >
              Organizers
            </Link>

            {user && (
              <>
                <Link
                  href="/become-organizer"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  Become Organizer
                </Link>
                <Link
                  href="/my-bookings"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  My Bookings
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Auth Buttons - Always show theme toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />
            <div className="hidden md:flex items-center space-x-3">
              {isLoading ? (
                <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    Welcome, {user.user_metadata?.first_name || user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button size="sm" className="btn-clean btn-primary" asChild>
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation - Cleaner design */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <nav className="py-6 space-y-4">
              <Link
                href="/events"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Events
              </Link>
              <Link
                href="/categories"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                href="/organizers"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Organizers
              </Link>
              <Link
                href="/become-organizer"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Become Organizer
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-bookings"
                    className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </>
              )}
            </nav>
            <div className="pt-4 space-y-3 border-t border-border/50">
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
              {isLoading ? (
                <div className="w-full h-8 bg-gray-200 animate-pulse rounded" />
              ) : user ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Welcome, {user.user_metadata?.first_name || user.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="w-full btn-clean btn-primary"
                    asChild
                  >
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
