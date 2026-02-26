import { v4 as uuidv4 } from 'uuid';
import { buildStampPayload, signStamp, verifyStamp, hashIp, maskEmail, generateSigningKeyPair, canonicalize } from './crypto';
import { verifyTurnstileToken } from './turnstile';
import {
  getActiveSigningKey, getSigningKey, storeSigningKey,
  createStampRecord, getStampWithSender, logValidation,
  getSender,
} from './supabase';
import type { StampPayload, StampResponse, StampValidationResult } from './types';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://signedinbox.com';
const DEFAULT_EXPIRY_DAYS = 30;

export async function ensureSigningKey() {
  const existing = await getActiveSigningKey();
  if (existing) return existing;
  const { keyId, publicKeyB64, privateKeyEnc } = generateSigningKeyPair();
  await storeSigningKey(keyId, publicKeyB64, privateKeyEnc);
  const key = await getActiveSigningKey();
  if (!key) throw new Error('Failed to create signing key');
  return key;
}

export async function createVerifiedStamp(opts: {
  senderId: string;
  userId: string;
  recipientEmail?: string;
  subjectHint?: string;
  contentHash?: string;
  turnstileToken: string;
  clientType?: string;
  ip?: string;
  skipTurnstile?: boolean;
}): Promise<StampResponse> {
  if (!opts.skipTurnstile) {
    const turnstileResult = await verifyTurnstileToken(opts.turnstileToken, opts.ip);
    if (!turnstileResult.success) {
      throw new Error(`CAPTCHA verification failed: ${turnstileResult.error}`);
    }
  }

  const sender = await getSender(opts.senderId);
  if (!sender || sender.user_id !== opts.userId) {
    throw new Error('Sender not found');
  }
  if (!sender.verified_email) {
    throw new Error('Sender email must be verified before creating stamps. Please verify your email address first.');
  }

  const signingKey = await ensureSigningKey();

  const stampId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60;
  const expiresAt = new Date(exp * 1000).toISOString();
  const createdAt = new Date(now * 1000).toISOString();

  const payload = buildStampPayload(
    stampId, opts.userId, sender.email,
    opts.recipientEmail || null, now, exp,
    opts.contentHash || null,
  );

  const signature = signStamp(payload, signingKey);
  const canonicalPayload = canonicalize(payload);

  await createStampRecord({
    sender_id: opts.senderId,
    user_id: opts.userId,
    recipient_email: opts.recipientEmail || null,
    subject_hint: opts.subjectHint || null,
    turnstile_token: opts.turnstileToken,
    turnstile_valid: true,
    signature,
    public_key_id: signingKey.key_id,
    verification_method: 'turnstile',
    client_type: opts.clientType || 'web',
    ip_hash: opts.ip ? hashIp(opts.ip) : null,
    expires_at: expiresAt,
    revoked: false,
    canonical_payload: canonicalPayload,
    content_hash: opts.contentHash || null,
  });

  const stampUrl = `${APP_URL}/verify/${stampId}`;
  const stampDateLabel = new Date(now * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
  const badgeHtml = `<a href="${stampUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#5a9471;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;text-decoration:none;padding:6px 14px;border-radius:20px;line-height:1.5;mso-padding-alt:0;">&#10003;&nbsp;Verified by signedinbox</a>`;
  const badgeText = `Verified by signedinbox · ${stampDateLabel}\n${stampUrl}`;

  return {
    stamp_id: stampId,
    stamp_url: stampUrl,
    badge_html: badgeHtml,
    badge_text: badgeText,
    signature,
    expires_at: expiresAt,
    created_at: createdAt,
    content_hash: opts.contentHash || null,
  };
}

export async function validateStamp(
  stampId: string,
  ipHash: string | null,
  userAgent: string | null,
  referrer: string | null,
): Promise<StampValidationResult> {
  const result = await getStampWithSender(stampId);

  if (!result) {
    await logValidation(stampId, false, 'not_found', ipHash, userAgent, referrer).catch(() => {});
    return { valid: false, stamp: null, signature_verified: false, failure_reason: 'not_found' };
  }

  const { stamp, sender } = result;

  const stampInfo = {
    id: stamp.id,
    sender_name: sender.display_name,
    sender_email_masked: maskEmail(sender.email),
    verification_method: stamp.verification_method,
    created_at: stamp.created_at,
    expires_at: stamp.expires_at,
    content_hash: stamp.content_hash,
  };

  if (stamp.revoked) {
    await logValidation(stampId, false, 'revoked', ipHash, userAgent, referrer);
    return { valid: false, stamp: stampInfo, signature_verified: false, failure_reason: 'revoked' };
  }

  if (new Date(stamp.expires_at) < new Date()) {
    await logValidation(stampId, false, 'expired', ipHash, userAgent, referrer);
    return { valid: false, stamp: stampInfo, signature_verified: false, failure_reason: 'expired' };
  }

  if (!stamp.canonical_payload) {
    await logValidation(stampId, true, null, ipHash, userAgent, referrer);
    return { valid: true, stamp: stampInfo, signature_verified: false, failure_reason: null };
  }

  const signingKey = await getSigningKey(stamp.public_key_id);
  if (!signingKey) {
    await logValidation(stampId, false, 'key_not_found', ipHash, userAgent, referrer);
    return { valid: false, stamp: null, signature_verified: false, failure_reason: 'key_not_found' };
  }

  let parsedPayload: StampPayload;
  try {
    parsedPayload = JSON.parse(stamp.canonical_payload) as StampPayload;
  } catch {
    await logValidation(stampId, false, 'payload_invalid', ipHash, userAgent, referrer);
    return { valid: false, stamp: null, signature_verified: false, failure_reason: 'payload_invalid' };
  }

  const signatureValid = verifyStamp(parsedPayload, stamp.signature, signingKey.public_key);
  if (!signatureValid) {
    await logValidation(stampId, false, 'signature_invalid', ipHash, userAgent, referrer);
    return { valid: false, stamp: stampInfo, signature_verified: false, failure_reason: 'signature_invalid' };
  }

  await logValidation(stampId, true, null, ipHash, userAgent, referrer);
  return { valid: true, stamp: stampInfo, signature_verified: true, failure_reason: null };
}
