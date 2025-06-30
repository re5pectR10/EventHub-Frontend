/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. We'll fix these issues after deployment.
    ignoreDuringBuilds: true,
  },
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
  // React strict mode configuration (disabled temporarily for auth debugging)
  // Note: This is only for development debugging. Re-enable for production!
  reactStrictMode: process.env.DISABLE_STRICT_MODE === "true" ? false : true,
  // Removed API rewrites since we're now using Supabase Edge Functions directly
};

module.exports = nextConfig;
