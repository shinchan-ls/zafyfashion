// lib/ratelimit.ts
//
// ─── SETUP (5 minutes) ────────────────────────────────────────────────────────
// 1. Go to https://console.upstash.com → Create Database → Redis → Free tier
// 2. Copy "UPSTASH_REDIS_REST_URL" and "UPSTASH_REDIS_REST_TOKEN" from the dashboard
// 3. Add both to your .env.local and Vercel environment variables
// 4. npm install @upstash/redis @upstash/ratelimit
//
// If you don't want Upstash, set DISABLE_RATE_LIMIT=true in .env
// and a no-op fallback will be used (useful for local dev).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// Lazy-load so the app doesn't crash if Upstash env vars aren't set yet
let ratelimit: any = null;

async function getRatelimiter() {
  if (ratelimit) return ratelimit;

  // No-op mode for local dev or if explicitly disabled
  if (
    process.env.DISABLE_RATE_LIMIT === "true" ||
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    ratelimit = { limit: async () => ({ success: true, limit: 999, remaining: 999, reset: 0 }) };
    return ratelimit;
  }

  const { Redis }     = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute per identifier
    analytics: true,
    prefix: "zafy_rl",
  });

  return ratelimit;
}

// ─── Get the best identifier for rate limiting ───────────────────────────────
// Priority: authenticated user ID > real IP > fallback
function getIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user_${userId}`;

  // Vercel sets x-real-ip; Cloudflare sets cf-connecting-ip
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";

  return `ip_${ip}`;
}

// ─── Main rate-limit check ────────────────────────────────────────────────────
// Returns null if allowed, or a NextResponse(429) if blocked.
// Usage in any route:
//
//   const limited = await checkRateLimit(req, session?.user?.id);
//   if (limited) return limited;
//
export async function checkRateLimit(
  req: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const limiter = await getRatelimiter();
  const identifier = getIdentifier(req, userId);

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
    console.warn(`Rate limited: ${identifier} on ${req.nextUrl.pathname}`);

    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      {
        status: 429,
        headers: {
          "Retry-After":         String(retryAfterSeconds),
          "X-RateLimit-Limit":   String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset":   String(reset),
        },
      }
    );
  }

  return null; // allowed
}

// ─── Stricter limiter for checkout (3 orders/min per user) ───────────────────
let checkoutRatelimit: any = null;

async function getCheckoutRatelimiter() {
  if (checkoutRatelimit) return checkoutRatelimit;

  if (
    process.env.DISABLE_RATE_LIMIT === "true" ||
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    checkoutRatelimit = { limit: async () => ({ success: true, limit: 999, remaining: 999, reset: 0 }) };
    return checkoutRatelimit;
  }

  const { Redis }     = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  checkoutRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 m"), // 3 checkout attempts per minute per user
    analytics: true,
    prefix: "zafy_checkout_rl",
  });

  return checkoutRatelimit;
}

export async function checkCheckoutRateLimit(
  req: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const limiter = await getCheckoutRatelimiter();
  const identifier = getIdentifier(req, userId);

  const { success, reset } = await limiter.limit(identifier);

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
    console.warn(`Checkout rate limited: ${identifier}`);

    return NextResponse.json(
      { error: "Too many order attempts. Please wait a moment before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  return null;
}