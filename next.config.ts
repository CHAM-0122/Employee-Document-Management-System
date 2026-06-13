import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // External-drive filesystem cache has been unstable in local development.
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;
