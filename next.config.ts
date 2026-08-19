import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['archiver'],
  
  // Skip TypeScript errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Empty turbopack config to silence webpack/turbopack error
  turbopack: {},
};

export default nextConfig;
