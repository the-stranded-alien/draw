import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Next.js image optimization requires a server — disable for static export
  images: { unoptimized: true },
  // Trailing slash so index.html is resolved correctly on GitHub Pages
  trailingSlash: true,
};

export default nextConfig;
