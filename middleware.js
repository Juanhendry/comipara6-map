// middleware.js — letakkan di ROOT project (sejajar package.json)
// Homepage (/) = PUBLIK. Hanya /dashboard yang dilindungi.

import { NextResponse } from "next/server";

export function middleware(request) {
  // Semua route lain (termasuk / dan /cp6-staff) lewat bebas.
  // Middleware ini hanya berjalan untuk /dashboard (lihat matcher di bawah).

  // Untuk production dengan Supabase, uncomment ini:
  // const token = request.cookies.get("sb-access-token")?.value;
  // if (!token) return NextResponse.redirect(new URL("/cp6-staff", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
