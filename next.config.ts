import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/meupet-app',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
