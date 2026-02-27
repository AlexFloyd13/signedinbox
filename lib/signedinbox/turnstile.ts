const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes': string[];
  challenge_ts?: string;
  hostname?: string;
}

async function verifyWithKey(secretKey: string, token: string, ip?: string): Promise<boolean> {
  const body: Record<string, string> = { secret: secretKey, response: token };
  if (ip) body.remoteip = ip;
  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data: TurnstileVerifyResponse = await res.json();
  return data.success;
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const extensionSecretKey = process.env.TURNSTILE_SECRET_KEY_EXTENSION;

  if (!secretKey && !extensionSecretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[turnstile] CRITICAL: No Turnstile secret key configured in production — rejecting request');
      return { success: false, error: 'Server configuration error: Turnstile not configured' };
    }
    // No secret key configured — bypass Turnstile verification (dev mode only)
    return { success: true };
  }

  try {
    // Try the website key first, then the extension key (each key only validates
    // tokens issued by its paired site key)
    if (secretKey && await verifyWithKey(secretKey, token, ip)) return { success: true };
    if (extensionSecretKey && await verifyWithKey(extensionSecretKey, token, ip)) return { success: true };
    return { success: false, error: 'CAPTCHA verification failed' };
  } catch {
    return { success: false, error: 'Turnstile service unavailable' };
  }
}
