import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { buildStampPayload, signStamp, verifyStamp, hashIp, maskEmail, generateSigningKeyPair, canonicalize } from './crypto';
import { verifyTurnstileToken } from './turnstile';
import {
  getActiveSigningKey, getSigningKey, storeSigningKey,
  createStampRecord, getStampWithSender, logValidation, getValidationCount,
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
  contentHash?: string;
  turnstileToken: string;
  clientType?: string;
  ip?: string;
  isMassSend?: boolean;
  declaredRecipientCount?: number;
}): Promise<StampResponse> {
  const turnstileResult = await verifyTurnstileToken(opts.turnstileToken, opts.ip);
  if (!turnstileResult.success) {
    throw new Error(`CAPTCHA verification failed: ${turnstileResult.error}`);
  }

  const sender = await getSender(opts.senderId);
  if (!sender || sender.user_id !== opts.userId) {
    throw new Error('Sender not found');
  }
  if (!sender.verified_email) {
    throw new Error('Sender email must be verified before creating stamps. Please verify your email address first.');
  }

  // Hash recipient email server-side — plaintext never stored
  const recipientEmailHash = opts.recipientEmail
    ? createHash('sha256').update(opts.recipientEmail.toLowerCase().trim()).digest('hex')
    : null;

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
    id: stampId,
    sender_id: opts.senderId,
    user_id: opts.userId,
    recipient_email_hash: recipientEmailHash,
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
    is_mass_send: opts.isMassSend || false,
    declared_recipient_count: opts.declaredRecipientCount || null,
  });

  const stampUrl = `${APP_URL}/verify/${stampId}`;
  const stampDateLabel = new Date(now * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
  const expiryLabel = new Date(exp * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    timeZone: 'UTC',
  });
  const badgeHtml = [
    '<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="width:100%;max-width:480px;" arcsize="25%" fillcolor="#f0f7f3" strokecolor="#b8d4c0" strokeweight="1px"><w:anchorlock/><center><![endif]-->',
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #b8d4c0;background-color:#f0f7f3;border-radius:12px;border-collapse:separate;font-family:Arial,Helvetica,sans-serif;max-width:480px;width:100%;">`,
    '<tr>',
    // Green checkmark circle
    '<td style="width:32px;padding:12px 0 12px 14px;vertical-align:middle;">',
    '<div style="width:32px;height:32px;border-radius:50%;background-color:#5a9471;text-align:center;line-height:32px;color:#ffffff;font-size:16px;font-weight:bold;">&#10003;</div>',
    '</td>',
    // Text block
    '<td style="padding:12px 8px;vertical-align:middle;">',
    '<div style="font-size:13px;font-weight:600;color:#1e4533;line-height:1.3;">Verified by signedinbox</div>',
    `<div style="font-size:11px;color:#5a9471;line-height:1.4;">${sender.email} &middot; Valid until ${expiryLabel}</div>`,
    '</td>',
    // Verify button
    `<td style="padding:12px 14px 12px 0;vertical-align:middle;text-align:right;">`,
    `<a href="${stampUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-size:11px;color:#4d7c63;text-decoration:none;border:1px solid #b8d4c0;border-radius:6px;padding:4px 10px;line-height:1.4;mso-padding-alt:0;">Verify&nbsp;&#8594;</a>`,
    '</td>',
    '</tr>',
    '</table>',
    '<!--[if mso]></center></v:roundrect><![endif]-->',
  ].join('');
  const badgeText = `This email was sent by a verified human at ${stampDateLabel}. Click to verify: ${stampUrl}`;

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
    return { valid: false, stamp: null, signature_verified: false, failure_reason: 'not_found', validation_count: 0, recipient_email_hash: null };
  }

  const { stamp, sender } = result;

  // Fetch prior count before logging this visit
  const validation_count = await getValidationCount(stampId);
  const recipient_email_hash = stamp.recipient_email_hash ?? null;

  const stampInfo = {
    id: stamp.id,
    sender_name: sender.display_name,
    sender_email_masked: maskEmail(sender.email),
    verification_method: stamp.verification_method,
    created_at: stamp.created_at,
    expires_at: stamp.expires_at,
    content_hash: stamp.content_hash,
    is_mass_send: stamp.is_mass_send,
    declared_recipient_count: stamp.declared_recipient_count,
  };

  if (stamp.revoked) {
    await logValidation(stampId, false, 'revoked', ipHash, userAgent, referrer);
    return { valid: false, stamp: stampInfo, signature_verified: false, failure_reason: 'revoked', validation_count, recipient_email_hash };
  }

  if (new Date(stamp.expires_at) < new Date()) {
    await logValidation(stampId, false, 'expired', ipHash, userAgent, referrer);
    return { valid: false, stamp: stampInfo, signature_verified: false, failure_reason: 'expired', validation_count, recipient_email_hash };
  }

  if (!stamp.canonical_payload) {
    await logValidation(stampId, true, null, ipHash, userAgent, referrer);
    return { valid: true, stamp: stampInfo, signature_verified: false, failure_reason: null, validation_count, recipient_email_hash };
  }

  const signingKey = await getSigningKey(stamp.public_key_id);
  if (!signingKey) {
    await logValidation(stampId, false, 'key_not_found', ipHash, userAgent, referrer);
    return { valid: false, stamp: null, signature_verified: false, failure_reason: 'key_not_found', validation_count, recipient_email_hash };
  }

  let parsedPayload: StampPayload;
  try {
    parsedPayload = JSON.parse(stamp.canonical_payload) as StampPayload;
  } catch {
    await logValidation(stampId, false, 'payload_invalid', ipHash, userAgent, referrer);
    return { valid: false, stamp: null, signature_verified: false, failure_reason: 'payload_invalid', validation_count, recipient_email_hash };
  }

  const signatureValid = verifyStamp(parsedPayload, stamp.signature, signingKey.public_key);
  if (!signatureValid) {
    await logValidation(stampId, false, 'signature_invalid', ipHash, userAgent, referrer);
    return { valid: false, stamp: stampInfo, signature_verified: false, failure_reason: 'signature_invalid', validation_count, recipient_email_hash };
  }

  await logValidation(stampId, true, null, ipHash, userAgent, referrer);
  return { valid: true, stamp: stampInfo, signature_verified: true, failure_reason: null, validation_count, recipient_email_hash };
}
