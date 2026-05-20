import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },

  // Excalidraw and its sub-packages ship as ESM — Next.js needs to transpile them
  transpilePackages: [
    "@excalidraw/excalidraw",
    "@excalidraw/common",
    "@excalidraw/element",
    "@excalidraw/math",
    "@excalidraw/utils",
  ],
};

export default nextConfig;
