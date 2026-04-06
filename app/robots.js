export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://comipara6.vercel.app'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cp6-staff', '/dashboard', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
