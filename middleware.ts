import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // ✅ Force non-www → www OR vice versa (choose ONE)
  if (url.hostname === "www.zafyfashion.com") {
    url.hostname = "zafyfashion.com";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ✅ Limit middleware scope (IMPORTANT for performance)
export const config = {
  matcher: [
    /*
      Match all request paths except:
      - _next (static files)
      - api (API routes)
      - favicon.ico
    */
    "/((?!_next|api|favicon.ico).*)",
  ],
};