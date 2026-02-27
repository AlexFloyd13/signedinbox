import { createHash, createCipheriv, createDecipheriv, generateKeyPairSync, sign, verify, randomBytes } from 'crypto';
import type { StampPayload, SigningKey } from './types';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('Missing ENCRYPTION_KEY env var');
  return createHash('sha256').update(key).digest();
}

export function encryptPrivateKey(privateKeyDer: Buffer): string {
  const encKey = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, encKey, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyDer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptPrivateKey(encryptedStr: string): Buffer {
  const encKey = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = encryptedStr.split(':');
  const iv = Buffer.from(ivB64, 'base64url');
  const authTag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv(ALGORITHM, encKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function generateSigningKeyPair(): { keyId: string; publicKeyB64: string; privateKeyEnc: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  const keyId = `v${Date.now()}`;
  const publicKeyB64 = (publicKey as Buffer).toString('base64url');
  const privateKeyEnc = encryptPrivateKey(privateKey as Buffer);
  return { keyId, publicKeyB64, privateKeyEnc };
}

/**
 * Hash email content for binding a stamp to specific email content.
 * Input: recipient email (lowercased) + "|" + subject + "|" + body text (trimmed)
 */
export function hashContent(recipientEmail: string, subject: string, bodyText: string): string {
  const input = `${recipientEmail.toLowerCase()}|${subject}|${bodyText.trim()}`;
  return createHash('sha256').update(input, 'utf-8').digest('hex');
}

export function buildStampPayload(
  stampId: string,
  userId: string,
  senderEmail: string,
  recipientEmail: string | null,
  createdAt: number,
  expiresAt: number,
  contentHash?: string | null,
  recipientEmailHash?: string | null,
): StampPayload {
  let rcpt: string;
  if (recipientEmailHash) {
    // Use the first 16 chars of the pre-computed SHA-256 hash (same as computing fresh)
    rcpt = recipientEmailHash.slice(0, 16);
  } else if (recipientEmail) {
    rcpt = createHash('sha256').update(recipientEmail).digest('hex').slice(0, 16);
  } else {
    rcpt = 'any';
  }
  return {
    v: 1,
    sid: stampId,
    sender: createHash('sha256').update(userId).digest('hex').slice(0, 16),
    email: createHash('sha256').update(senderEmail).digest('hex').slice(0, 16),
    rcpt,
    ch: contentHash || 'unbound',
    ts: createdAt,
    exp: expiresAt,
    nonce: randomBytes(16).toString('hex'),
  };
}

export function canonicalize(payload: StampPayload): string {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(payload).sort()) {
    sorted[key] = (payload as unknown as Record<string, unknown>)[key];
  }
  return JSON.stringify(sorted);
}

export function signStamp(payload: StampPayload, signingKey: SigningKey): string {
  const privateKeyDer = decryptPrivateKey(signingKey.private_key_enc);
  const message = Buffer.from(canonicalize(payload), 'utf-8');
  const privateKeyObj = {
    key: privateKeyDer,
    format: 'der' as const,
    type: 'pkcs8' as const,
  };
  const signature = sign(null, message, privateKeyObj);
  return signature.toString('base64url');
}

export function verifyStamp(payload: StampPayload, signature: string, publicKeyB64: string): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyB64, 'base64url');
    const message = Buffer.from(canonicalize(payload), 'utf-8');
    const sigBuffer = Buffer.from(signature, 'base64url');
    const publicKeyObj = {
      key: publicKeyDer,
      format: 'der' as const,
      type: 'spki' as const,
    };
    return verify(null, message, publicKeyObj, sigBuffer);
  } catch {
    return false;
  }
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
