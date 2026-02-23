const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes': string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    if (process.env.TURNSTILE_DEV_BYPASS === 'true') {
      return { success: true };
    }
    return { success: false, error: 'Turnstile not configured' };
  }

  try {
    const body: Record<string, string> = {
      secret: secretKey,
      response: token,
    };
    if (ip) body.remoteip = ip;

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    const data: TurnstileVerifyResponse = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data['error-codes']?.join(', ') || 'Verification failed' };
  } catch {
    return { success: false, error: 'Turnstile service unavailable' };
  }
}
