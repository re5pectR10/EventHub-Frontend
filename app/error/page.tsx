"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">
                Authentication Error
              </CardTitle>
            </CardHeader>

            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                There was an error confirming your email address. This could
                happen if:
              </p>

              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li>• The confirmation link has expired</li>
                <li>• The link has already been used</li>
                <li>• The link is invalid or corrupted</li>
              </ul>

              <div className="pt-4 space-y-3">
                <Button asChild className="w-full">
                  <Link href="/auth/signup">Try signing up again</Link>
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href="/auth/signin">Sign in instead</Link>
                </Button>

                <Button variant="ghost" asChild className="w-full">
                  <Link href="/">Go to homepage</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
