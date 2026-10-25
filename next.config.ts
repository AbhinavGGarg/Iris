import type { NextConfig } from "next";

// Unknown /api/* calls go to the Python backend: localhost in dev, or BACKEND_URL
// when one is deployed. On a hosted site without it, there's nothing to forward to.
const BACKEND_URL =
  process.env.BACKEND_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    qualities: [75, 90],
  },
  async rewrites() {
    if (!BACKEND_URL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
