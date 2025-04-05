import path from 'path';
import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    ppr: 'incremental',
  },
  webpack: (config, { isServer }) => {
    // Add hexoid alias
    config.resolve.alias['hexoid'] = path.resolve('node_modules/hexoid/dist/index.js');

    // Keep existing fallback configuration for non-server builds
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        os: false,
        path: false,
        module: false
      }
    }
    return config;
  }
};

export default nextConfig;
