import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["swisseph"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/swisseph/build/Release/swisseph.node"],
  },
};

export default nextConfig;
