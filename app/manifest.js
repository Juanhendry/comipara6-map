export default function manifest() {
  return {
    name: 'Comipara 6 Floor Map',
    short_name: 'Comipara 6',
    description: 'Peta interaktif booth Comipara 6. Temukan dengan mudah lokasi kreator favoritmu, katalog karya, dan daftar harga.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d1a', // Assuming dark theme from your project references
    theme_color: '#8b5cf6', // Violet 500 theme
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
