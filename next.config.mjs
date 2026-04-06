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

  // Global Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in https://vitals.vercel-insights.com;" }
        ]
      }
    ];
  },
};

export default nextConfig;
