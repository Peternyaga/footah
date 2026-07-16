import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  typescript: {
    // TypeScript is checked explicitly by `npm run lint` before the production build.
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
  },
};

export default nextConfig;
