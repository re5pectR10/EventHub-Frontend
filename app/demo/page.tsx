import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src="/assets/logo/next1ntown-light.svg"
                alt="Next1nTown"
                width={200}
                height={48}
                className="h-12 w-auto dark:hidden"
                priority
              />
              <Image
                src="/assets/logo/next1ntown-dark.svg"
                alt="Next1nTown"
                width={200}
                height={48}
                className="h-12 w-auto hidden dark:block"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Dark Mode Demo
            </h1>
            <p className="text-lg text-muted-foreground">
              Experience our new dark mode feature with the Next1nTown branding
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Toggle Theme:</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Demo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Card 1</h3>
              <p className="text-muted-foreground mb-4">
                This card demonstrates how our components look in both light and
                dark modes.
              </p>
              <Button variant="default">Primary Button</Button>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Card 2</h3>
              <p className="text-muted-foreground mb-4">
                Notice how the text and background colors automatically adapt to
                the selected theme.
              </p>
              <Button variant="secondary">Secondary Button</Button>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Card 3</h3>
              <p className="text-muted-foreground mb-4">
                The theme system uses CSS variables for seamless transitions
                between light and dark modes.
              </p>
              <Button variant="outline">Outline Button</Button>
            </Card>
          </div>

          {/* Features List */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Dark Mode Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">System Theme Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically matches your system preference
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Smooth Transitions</h4>
                  <p className="text-sm text-muted-foreground">
                    Seamless switching between themes
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Persistent Preference</h4>
                  <p className="text-sm text-muted-foreground">
                    Your theme choice is remembered across sessions
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Logo Adaptation</h4>
                  <p className="text-sm text-muted-foreground">
                    Logo automatically switches between light and dark variants
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
