import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable to prevent double rendering
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
