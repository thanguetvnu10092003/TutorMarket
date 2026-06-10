import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// In-memory store — best-effort for serverless (resets per cold start)
// For distributed rate limiting upgrade to Upstash Redis:
// https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
const store = new Map<string, RateLimitStore>();

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSecs: number;
}

export function rateLimit(req: NextRequest, config: RateLimitConfig): NextResponse | null {
  const ip = getIP(req);
  const key = `${req.nextUrl.pathname}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSecs * 1000 });
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

// Presets for common routes
export const RATE_LIMITS = {
  /** Auth routes: 10 requests per 15 minutes */
  auth: { limit: 10, windowSecs: 900 },
  /** Upload: 5 per minute */
  upload: { limit: 5, windowSecs: 60 },
  /** General API: 60 per minute */
  api: { limit: 60, windowSecs: 60 },
  /** Payments: 20 per 10 minutes */
  payments: { limit: 20, windowSecs: 600 },
} satisfies Record<string, RateLimitConfig>;
