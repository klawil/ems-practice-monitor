import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_TYPE === 'static'
    ? 'export'
    : 'standalone',
};

export default nextConfig;
