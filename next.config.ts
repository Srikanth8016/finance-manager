import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // These packages use native addons or Worker threads that can't be bundled.
      // Mark them external so Node.js resolves them at runtime from node_modules.
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...externals,
        "@napi-rs/canvas",
        "canvas",
        "pdfjs-dist",
      ];
    }
    return config;
  },
};

export default nextConfig;
