import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`),
  title: {
    template: '%s | Comipara 6 Map',
    default: 'Comipara 6 Floor Map',
  },
  description: "Peta interaktif booth Comipara 6. Temukan dengan mudah lokasi kreator favoritmu, katalog karya, dan daftar harga di lantai eksibisi secara real-time.",
  keywords: ["Comipara 6", "Comipara6", "Comic frontier", "Comic Paradise", "Floor map event", "Peta booth event", "Katalog doujin"],
  authors: [{ name: 'Comic Paradise' }],
  creator: 'Comic Paradise',
  publisher: 'Comic Paradise',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Comipara 6 Floor Map',
    description: 'Peta interaktif booth Comipara 6. Temukan dengan mudah lokasi kreator favoritmu.',
    url: '/',
    siteName: 'Comipara 6',
    images: [
      {
        url: '/og-image.jpg', // Placeholder for OG Image
        width: 1200,
        height: 630,
        alt: 'Comipara 6 Peta Interaktif',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comipara 6 Floor Map',
    description: 'Peta interaktif booth Comipara 6. Temukan daftar kreator favoritmu.',
    creator: '@comipara',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
