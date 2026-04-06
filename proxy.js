import { NextResponse } from "next/server";

// Simple Edge-compatible LRU for IP Rate Limiting 
// (Reset on node/edge worker cold-start, but provides solid basic layer)
const rateLimitMap = new Map();

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // 1. Proteksi Basic Auth untuk halaman login staff
  if (pathname.startsWith("/cp6-staff")) {
    const basicAuth = request.headers.get("authorization");
    if (!basicAuth) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
      });
    }

    // Fallback `admin:comipara6` sesuai persetujuan
    const authValue = process.env.STAFF_AUTH_CREDENTIALS || "admin:comipara6";
    const expected = `Basic ${btoa(authValue)}`;
    if (basicAuth !== expected) {
      return new NextResponse("Authentication failed", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
      });
    }
  }

  // 2. IP Rate Limiting & Strict CORS untuk route /api
  if (pathname.startsWith("/api/")) {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const limit = 100; // Max 100 requests / 1 menit
    const windowMs = 60 * 1000;
    const now = Date.now();
    
    let record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
    } else {
      record.count++;
    }
    
    // Prevent Memory Leak on huge traffic
    if (rateLimitMap.size > 10000) rateLimitMap.clear();
    rateLimitMap.set(ip, record);

    if (record.count > limit) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }

    // Header CORS (Restrict domain if environment available)
    const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "*";
    if (allowedOrigin !== "*") {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cp6-session");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return response;
}

export const config = {
  matcher: ["/(.*)"],
};
