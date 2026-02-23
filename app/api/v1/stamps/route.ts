import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { applySecurity, getClientIP } from '@/lib/security';
import { authenticateUser, AuthError } from '@/lib/auth';
import { CreateStampSchema, CreateSenderSchema, CreateApiKeySchema, VerifyEmailSchema } from '@/lib/signedinbox/validation';
import { createVerifiedStamp } from '@/lib/signedinbox/stamps';
import {
  getSendersByUser, createSender, listStamps, getStats, listApiKeys,
  createApiKeyRecord, getApiKeyByHash, createEmailVerification, verifyEmailCode,
} from '@/lib/signedinbox/supabase';

async function authenticateRequest(req: NextRequest): Promise<{ userId: string }> {
  // Try Supabase JWT first
  const user = await authenticateUser(req);
  if (user) return { userId: user.id };

  // Try SignedInbox API key
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer si_')) {
    const apiKey = authHeader.slice(7);
    const secret = process.env.API_KEY_HASH_SECRET;
    if (!secret) {
      throw new AuthError('Server configuration error: API key authentication unavailable');
    }
    const keyHash = createHmac('sha256', secret).update(apiKey).digest('hex');
    const apiKeyRecord = await getApiKeyByHash(keyHash);
    if (apiKeyRecord) {
      return { userId: apiKeyRecord.user_id };
    }
  }

  throw new AuthError('Authentication required');
}

export async function POST(request: NextRequest) {
  const sec = applySecurity(request, { rateLimitType: 'stamps' });
  if (sec.blocked) return sec.response!;

  try {
    const { userId } = await authenticateRequest(request);
    const body = await request.json();
    const action = body.action;

    if (action === 'create-sender') {
      const parsed = CreateSenderSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });
      const sender = await createSender(userId, parsed.data.display_name, parsed.data.email);
      return NextResponse.json({ sender }, { status: 201, headers: sec.headers });
    }

    if (action === 'send-verification') {
      const senderId = body.sender_id as string;
      if (!senderId) return NextResponse.json({ error: 'sender_id required' }, { status: 400, headers: sec.headers });
      // TODO: Send via email (Resend/SendGrid) when configured
      const { code } = await createEmailVerification(senderId);
      return NextResponse.json({ message: 'Verification code generated', code }, { status: 200, headers: sec.headers });
    }

    if (action === 'verify-email') {
      const parsed = VerifyEmailSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });
      const verified = await verifyEmailCode(parsed.data.sender_id, parsed.data.code);
      if (!verified) return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400, headers: sec.headers });
      return NextResponse.json({ success: true }, { headers: sec.headers });
    }

    if (action === 'create-api-key') {
      const parsed = CreateApiKeySchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });
      const secret = process.env.API_KEY_HASH_SECRET;
      if (!secret) return NextResponse.json({ error: 'API key creation unavailable: server configuration error' }, { status: 500, headers: sec.headers });
      const rawKey = `si_live_${randomBytes(32).toString('base64url')}`;
      const keyHash = createHmac('sha256', secret).update(rawKey).digest('hex');
      const keyPrefix = rawKey.slice(0, 16);
      const scopes = parsed.data.scopes || ['stamp:create', 'stamp:validate'];
      const record = await createApiKeyRecord(userId, parsed.data.name, keyHash, keyPrefix, scopes);
      return NextResponse.json({ id: record.id, name: record.name, api_key: rawKey, key_prefix: keyPrefix, scopes, created_at: record.created_at }, { status: 201, headers: sec.headers });
    }

    if (action === 'revoke') {
      const stampId = body.stamp_id as string;
      if (!stampId) return NextResponse.json({ error: 'stamp_id required' }, { status: 400, headers: sec.headers });
      const { revokeStamp } = await import('@/lib/signedinbox/supabase');
      await revokeStamp(stampId, userId);
      return NextResponse.json({ success: true }, { headers: sec.headers });
    }

    // Default: create stamp
    const parsed = CreateStampSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });

    const ip = getClientIP(request);
    const stamp = await createVerifiedStamp({
      senderId: parsed.data.sender_id,
      userId,
      recipientEmail: parsed.data.recipient_email,
      subjectHint: parsed.data.subject_hint,
      contentHash: parsed.data.content_hash,
      turnstileToken: parsed.data.turnstile_token,
      clientType: parsed.data.client_type,
      ip,
    });

    return NextResponse.json(stamp, { status: 201, headers: sec.headers });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode, headers: sec.headers });
    const message = err instanceof Error ? err.message : 'Internal server error';
    const isBadRequest = message.includes('CAPTCHA') || message.includes('Sender not found') || message.includes('verified');
    if (!isBadRequest) console.error('[signedinbox POST]', err);
    return NextResponse.json({ error: message }, { status: isBadRequest ? 400 : 500, headers: sec.headers });
  }
}

export async function GET(request: NextRequest) {
  const sec = applySecurity(request, { rateLimitType: 'stamps' });
  if (sec.blocked) return sec.response!;

  try {
    const { userId } = await authenticateRequest(request);
    const sp = request.nextUrl.searchParams;

    if (sp.get('action') === 'stats') {
      const days = parseInt(sp.get('days') || '30', 10);
      const stats = await getStats(userId, days);
      return NextResponse.json(stats, { headers: sec.headers });
    }

    if (sp.get('action') === 'senders') {
      const senders = await getSendersByUser(userId);
      return NextResponse.json({ senders }, { headers: sec.headers });
    }

    if (sp.get('action') === 'api-keys') {
      const keys = await listApiKeys(userId);
      const safeKeys = keys.map(({ key_hash, ...rest }) => rest);
      return NextResponse.json({ keys: safeKeys }, { headers: sec.headers });
    }

    const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 100);
    const offset = parseInt(sp.get('offset') || '0', 10);
    const { stamps, total } = await listStamps(userId, limit, offset);
    return NextResponse.json({ stamps, total }, { headers: sec.headers });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode, headers: sec.headers });
    console.error('[signedinbox GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: sec.headers });
  }
}
