import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("khodam_auth_token")?.value;

  // Protect /admin routes
  if (path.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?callbackUrl=" + encodeURIComponent(path), request.url));
    }
  }

  // Protect /khadem routes
  if (path.startsWith("/khadem")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?callbackUrl=" + encodeURIComponent(path), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/khadem/:path*"],
};
