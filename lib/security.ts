import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// ─── Rate Limiting (Upstash Redis — shared across all Vercel instances) ────────

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number; limit: number };

let _limiters: Record<string, Ratelimit> | null = null;

function getLimiters(): Record<string, Ratelimit> | null {
  if (_limiters) return _limiters;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // dev fallback: in-memory below
  const redis = new Redis({ url, token });
  _limiters = {
    default:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '60 s'), prefix: 'rl:default' }),
    stamps_read:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '60 s'), prefix: 'rl:stamps_read' }),
    stamps_write: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,  '60 s'), prefix: 'rl:stamps_write' }),
    auth:         new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '60 s'), prefix: 'rl:auth' }),
    validation:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '60 s'), prefix: 'rl:validation' }),
  };
  return _limiters;
}

// Fallback: simple in-memory store used when Redis is not configured (local dev).
// Not suitable for production — limits are per-instance only.
interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>();
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of memStore) if (e.resetAt < now) memStore.delete(k);
}, 60_000).unref?.();
const MEM_LIMITS: Record<string, { window: number; max: number }> = {
  default:      { window: 60_000, max: 100 },
  stamps_read:  { window: 60_000, max: 60 },
  stamps_write: { window: 60_000, max: 20 },
  auth:         { window: 60_000, max: 10 },
  validation:   { window: 60_000, max: 60 },
};
function checkMemLimit(ip: string, type: string): RateLimitResult {
  const cfg = MEM_LIMITS[type] ?? MEM_LIMITS.default;
  const key = `${type}:${ip}`;
  const now = Date.now();
  let e = memStore.get(key);
  if (!e || e.resetAt < now) {
    e = { count: 1, resetAt: now + cfg.window };
    memStore.set(key, e);
    return { allowed: true, remaining: cfg.max - 1, resetAt: e.resetAt, limit: cfg.max };
  }
  e.count++;
  return { allowed: e.count <= cfg.max, remaining: Math.max(0, cfg.max - e.count), resetAt: e.resetAt, limit: cfg.max };
}

async function checkRateLimit(req: NextRequest, type = 'default'): Promise<RateLimitResult> {
  const ip = getClientIP(req);
  const limiters = getLimiters();
  if (!limiters) return checkMemLimit(ip, type); // dev fallback
  const limiter = limiters[type] ?? limiters.default;
  const { success, remaining, reset, limit } = await limiter.limit(ip);
  return { allowed: success, remaining, resetAt: reset, limit };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://signedinbox.com',
  'https://www.signedinbox.com',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
];
const ORIGIN_REGEXES = [
  /^https:\/\/signedinbox(-[a-z0-9]+)?\.vercel\.app$/,
  /^chrome-extension:\/\/[a-z]{32}$/,
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || ORIGIN_REGEXES.some(r => r.test(origin));
}

// ─── Security Headers ─────────────────────────────────────────────────────────
function securityHeaders(requestId: string): Record<string, string> {
  return {
    'X-Request-ID': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Vary': 'Origin',
  };
}

// ─── Unified middleware ────────────────────────────────────────────────────────
export interface SecurityOptions {
  rateLimitType?: string;
  skipRateLimit?: boolean;
}

export async function applySecurity(req: NextRequest, options: SecurityOptions = {}): Promise<{
  blocked: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
}> {
  const { rateLimitType = 'default', skipRateLimit = false } = options;
  const requestId = randomUUID();
  const origin = req.headers.get('origin');
  const hdrs = securityHeaders(requestId);

  if (isAllowedOrigin(origin)) {
    hdrs['Access-Control-Allow-Origin'] = origin!;
  }
  hdrs['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
  hdrs['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
  hdrs['Access-Control-Max-Age'] = '86400';

  if (req.method === 'OPTIONS') {
    return { blocked: true, response: new NextResponse(null, { status: 200, headers: hdrs }), headers: hdrs };
  }

  if (!skipRateLimit) {
    const rl = await checkRateLimit(req, rateLimitType);
    hdrs['X-RateLimit-Limit'] = String(rl.limit);
    hdrs['X-RateLimit-Remaining'] = String(rl.remaining);
    hdrs['X-RateLimit-Reset'] = String(Math.ceil(rl.resetAt / 1000));
    if (!rl.allowed) {
      const res = NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429, headers: hdrs }
      );
      return { blocked: true, response: res, headers: hdrs };
    }
  }

  return { blocked: false, headers: hdrs };
}
