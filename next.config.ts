import type { NextConfig } from "next";

const publicUrl = process.env.FRONTEND_URL;
const basePath = publicUrl ? new URL(publicUrl).pathname.replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
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
