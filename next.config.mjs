/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Enable gzip/brotli compression
  compress: true,

  // Image optimization settings
  images: {
    // Allow serving uploaded images from Supabase Storage
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nnpxmjaohdvmuaqcskib.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Production-optimized standalone output
  output: "standalone",
};

export default nextConfig;
