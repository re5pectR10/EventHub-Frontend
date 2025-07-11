import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Next1nTown - Discover Amazing Local Experiences",
  description:
    "Find and book unique local events, workshops, and activities in your area.",
  keywords: ["local events", "activities", "workshops", "booking", "community"],
  authors: [{ name: "Next1nTown Team" }],
  openGraph: {
    title: "Next1nTown",
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
