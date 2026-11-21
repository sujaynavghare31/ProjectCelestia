import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.80"],
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["swisseph"],
  outputFileTracingIncludes: {
    "/api/ephemeris": ["./node_modules/swisseph/build/Release/swisseph.node"],
    "/api/panchang": ["./node_modules/swisseph/build/Release/swisseph.node"],
    "/api/astrology/nadi/timeline": ["./node_modules/swisseph/build/Release/swisseph.node"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "date-fns"],
  },
};

export default nextConfig;
