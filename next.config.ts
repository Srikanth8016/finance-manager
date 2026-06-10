import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  api: {
    bodyParser: false, // needed for formData/file uploads
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
