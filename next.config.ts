import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // 1️⃣ Do not bundle Tesseract.js into the server bundle
    serverComponentsExternalPackages: ['tesseract.js'],
    // 2️⃣ Make sure .wasm (and any .proto) files under node_modules are traced and included in the output
    outputFileTracingIncludes: {
      '/api/**/*': [
        './node_modules/**/*.wasm',
        './node_modules/**/*.proto'
      ]
    }
  }
};

export default nextConfig;
