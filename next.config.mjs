/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Enable gzip/brotli compression
  compress: true,

  // Image optimization settings
  images: {
    // Allow serving uploaded images
    formats: ["image/avif", "image/webp"],
  },

  // Production-optimized standalone output
  output: "standalone",

  // Cache static assets aggressively
  headers: async () => [
    {
      source: "/uploads/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
