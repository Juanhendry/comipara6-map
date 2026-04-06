export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://comipara6.vercel.app'

  // If you later use a database, you can dynamically fetch booth/author catalog URLs
  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // We intentionally exclude /dashboard and /cp6-staff from sitemap
  ]
}
