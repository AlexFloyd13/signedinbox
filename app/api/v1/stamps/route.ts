import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { applySecurity, getClientIP } from '@/lib/security';
import { authenticateUser, AuthError } from '@/lib/auth';
import { CreateStampSchema, CreateSenderSchema, CreateApiKeySchema, VerifyEmailSchema } from '@/lib/signedinbox/validation';
import { createVerifiedStamp } from '@/lib/signedinbox/stamps';
import {
  getSendersByUser, getSender, createSender, markSenderVerified, listStamps, getStats, listApiKeys,
  createApiKeyRecord, getApiKeyByHash, createEmailVerification, verifyEmailCode,
} from '@/lib/signedinbox/supabase';
import { sendVerificationEmail } from '@/lib/email';

async function authenticateRequest(req: NextRequest): Promise<{ userId: string; scopes: string[] | null }> {
  // Try Supabase JWT first — unrestricted (null scopes = full access)
  const user = await authenticateUser(req);
  if (user) return { userId: user.id, scopes: null };

  // Try SignedInbox API key — restricted to declared scopes
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
      return { userId: apiKeyRecord.user_id, scopes: apiKeyRecord.scopes };
    }
  }

  throw new AuthError('Authentication required');
}

/** Enforce a required scope for API key callers. JWT callers always pass. */
function requireScope(scopes: string[] | null, scope: string): void {
  if (scopes === null) return; // JWT = unrestricted
  if (!scopes.includes(scope)) throw new AuthError(`Insufficient permissions. Required scope: ${scope}`, 403);
}

/** Require the caller to be a JWT user, not an API key. */
function requireJwt(scopes: string[] | null, action: string): void {
  if (scopes !== null) throw new AuthError(`Action '${action}' requires direct authentication, not an API key`, 403);
}

export async function POST(request: NextRequest) {
  const sec = await applySecurity(request, { rateLimitType: 'stamps_write' });
  if (sec.blocked) return sec.response!;

  try {
    const { userId, scopes } = await authenticateRequest(request);
    const body = await request.json();
    const action = body.action;

    if (action === 'create-sender') {
      requireJwt(scopes, 'create-sender');
      const parsed = CreateSenderSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });
      const sender = await createSender(userId, parsed.data.display_name, parsed.data.email);
      return NextResponse.json({ sender }, { status: 201, headers: sec.headers });
    }

    if (action === 'claim-auth-email') {
      // Requires Supabase JWT — email is already verified by auth provider
      requireJwt(scopes, 'claim-auth-email');
      const authUser = await authenticateUser(request);
      if (!authUser?.email) return NextResponse.json({ error: 'Supabase JWT required' }, { status: 401, headers: sec.headers });

      const prefix = authUser.email.split('@')[0];
      const displayName = prefix.replace(/[._\-+]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || authUser.email;

      const existing = (await getSendersByUser(authUser.id)).find((s) => s.email === authUser.email);
      if (existing) {
        if (!existing.verified_email) await markSenderVerified(existing.id);
        return NextResponse.json({ sender: { ...existing, verified_email: true } }, { headers: sec.headers });
      }

      const sender = await createSender(authUser.id, displayName, authUser.email);
      await markSenderVerified(sender.id);
      return NextResponse.json({ sender: { ...sender, verified_email: true } }, { status: 201, headers: sec.headers });
    }

    if (action === 'send-verification') {
      requireJwt(scopes, 'send-verification');
      const senderId = body.sender_id as string;
      if (!senderId) return NextResponse.json({ error: 'sender_id required' }, { status: 400, headers: sec.headers });
      const sender = await getSender(senderId);
      if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404, headers: sec.headers });
      if (sender.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: sec.headers });
      const { code } = await createEmailVerification(senderId);
      await sendVerificationEmail(sender.email, code);
      return NextResponse.json({ message: 'Verification code sent' }, { status: 200, headers: sec.headers });
    }

    if (action === 'verify-email') {
      requireJwt(scopes, 'verify-email');
      const parsed = VerifyEmailSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });
      // Verify the sender belongs to the authenticated user before accepting the code
      const sender = await getSender(parsed.data.sender_id);
      if (!sender || sender.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: sec.headers });
      const verified = await verifyEmailCode(parsed.data.sender_id, parsed.data.code);
      if (!verified) return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400, headers: sec.headers });
      return NextResponse.json({ success: true }, { headers: sec.headers });
    }

    if (action === 'create-api-key') {
      requireJwt(scopes, 'create-api-key');
      const parsed = CreateApiKeySchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });
      const secret = process.env.API_KEY_HASH_SECRET;
      if (!secret) return NextResponse.json({ error: 'API key creation unavailable: server configuration error' }, { status: 500, headers: sec.headers });
      const rawKey = `si_live_${randomBytes(32).toString('base64url')}`;
      const keyHash = createHmac('sha256', secret).update(rawKey).digest('hex');
      const keyPrefix = rawKey.slice(0, 16);
      const keyScopes = parsed.data.scopes || ['stamp:create', 'stamp:validate'];
      const record = await createApiKeyRecord(userId, parsed.data.name, keyHash, keyPrefix, keyScopes);
      return NextResponse.json({ id: record.id, name: record.name, api_key: rawKey, key_prefix: keyPrefix, scopes: keyScopes, created_at: record.created_at }, { status: 201, headers: sec.headers });
    }

    if (action === 'revoke') {
      requireScope(scopes, 'stamp:revoke');
      const stampId = body.stamp_id as string;
      if (!stampId) return NextResponse.json({ error: 'stamp_id required' }, { status: 400, headers: sec.headers });
      const { revokeStamp } = await import('@/lib/signedinbox/supabase');
      await revokeStamp(stampId, userId);
      return NextResponse.json({ success: true }, { headers: sec.headers });
    }

    // Default: create stamp
    requireScope(scopes, 'stamp:create');
    const parsed = CreateStampSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400, headers: sec.headers });

    const ip = getClientIP(request);
    const stamp = await createVerifiedStamp({
      senderId: parsed.data.sender_id,
      userId,
      recipientEmail: parsed.data.recipient_email,
      recipientEmailHash: parsed.data.recipient_email_hash,
      contentHash: parsed.data.content_hash,
      turnstileToken: parsed.data.turnstile_token,
      clientType: parsed.data.client_type,
      ip,
      isMassSend: parsed.data.is_mass_send,
      declaredRecipientCount: parsed.data.declared_recipient_count,
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
  const sec = await applySecurity(request, { rateLimitType: 'stamps_read' });
  if (sec.blocked) return sec.response!;

  try {
    const { userId, scopes } = await authenticateRequest(request);
    const sp = request.nextUrl.searchParams;

    if (sp.get('action') === 'stats') {
      requireJwt(scopes, 'stats');
      const days = Math.min(Math.max(parseInt(sp.get('days') || '30', 10), 1), 365);
      const stats = await getStats(userId, days);
      return NextResponse.json(stats, { headers: sec.headers });
    }

    if (sp.get('action') === 'senders') {
      requireJwt(scopes, 'senders');
      const senders = await getSendersByUser(userId);
      return NextResponse.json({ senders }, { headers: sec.headers });
    }

    if (sp.get('action') === 'api-keys') {
      requireJwt(scopes, 'api-keys');
      const keys = await listApiKeys(userId);
      const safeKeys = keys.map(({ key_hash, ...rest }) => rest);
      return NextResponse.json({ keys: safeKeys }, { headers: sec.headers });
    }

    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(sp.get('offset') || '0', 10), 0);
    const { stamps, total } = await listStamps(userId, limit, offset);
    return NextResponse.json({ stamps, total }, { headers: sec.headers });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode, headers: sec.headers });
    console.error('[signedinbox GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: sec.headers });
  }
}
