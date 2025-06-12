import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Local Events Hub - Discover Amazing Local Experiences",
  description:
    "Find and book unique local events, workshops, and activities in your area.",
  keywords: ["local events", "activities", "workshops", "booking", "community"],
  authors: [{ name: "Local Events Hub Team" }],
  openGraph: {
    title: "Local Events Hub",
    description: "Discover amazing local experiences",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
