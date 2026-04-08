// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";

  // www ko non-www pe redirect mat karo
  // Sirf non-www ko www pe redirect karo (clean & safe)
  if (host === "zafyfashion.com") {
    url.hostname = "www.zafyfashion.com";
    return NextResponse.redirect(url, 308); // Permanent redirect
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};