import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

if (process.env.BUILD_TYPE === 'static') {
  nextConfig.output = 'export';
  nextConfig.distDir = 'build';
  nextConfig.exportTrailingSlash = true;
}

export default nextConfig;
