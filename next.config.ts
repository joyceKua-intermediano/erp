import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  serverExternalPackages: ["@myriaddreamin/typst-ts-node-compiler"],
  // Contract PDFs compile against the Typst library and fonts read from disk at runtime, in a renderer process
  // (typst/renderer.mjs) that loads the native compiler itself, so the compiler isn't traced through imports.
  outputFileTracingIncludes: {
    "/api/**": ["./typst/**/*", "./node_modules/@myriaddreamin/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
