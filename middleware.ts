import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Only redirect if hostname EXACTLY matches
  if (req.headers.get("host") === "www.zafyfashion.com") {
    url.hostname = "zafyfashion.com";
    return NextResponse.redirect(url, 308); // permanent redirect
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};