const { loadEnvConfig } = require("@next/env");

// Load environment variables from the project root (monorepo setup)
const projectDir = process.cwd().includes("apps/web")
  ? process.cwd().replace("/apps/web", "").replace("\\apps\\web", "")
  : process.cwd();

loadEnvConfig(projectDir);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@local-events-hub/database"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Removed API rewrites since we're now using Supabase Edge Functions directly
};

module.exports = nextConfig;
