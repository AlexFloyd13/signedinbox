import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// ─── Rate Limiting (in-memory, per-instance) ──────────────────────────────────
interface RateLimitEntry { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, 60_000).unref?.();

interface RateLimitConfig { windowMs: number; maxRequests: number }
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default:  { windowMs: 60_000, maxRequests: 100 },
  stamps:   { windowMs: 60_000, maxRequests: 30 },
  auth:     { windowMs: 60_000, maxRequests: 10 },
};

function checkRateLimit(req: NextRequest, type = 'default') {
  const config = RATE_LIMITS[type] ?? RATE_LIMITS.default;
  const key = `${type}:${getClientIP(req)}`;
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: entry.resetAt, limit: config.maxRequests };
  }
  entry.count++;
  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
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
  };
}

// ─── Unified middleware ────────────────────────────────────────────────────────
export interface SecurityOptions {
  rateLimitType?: string;
  skipRateLimit?: boolean;
}

export function applySecurity(req: NextRequest, options: SecurityOptions = {}): {
  blocked: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
} {
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
    const rl = checkRateLimit(req, rateLimitType);
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
