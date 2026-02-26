import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import type { SignedInboxSender, SignedInboxStamp, SignedInboxApiKey, SigningKey } from './types';

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

// ─── Senders ─────────────────────────────────────────────────────────────────

export async function getSendersByUser(userId: string): Promise<SignedInboxSender[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_senders').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function getSender(id: string): Promise<SignedInboxSender | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_senders').select('*').eq('id', id).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  return data;
}

export async function createSender(userId: string, displayName: string, email: string): Promise<SignedInboxSender> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_senders').insert({
    user_id: userId,
    display_name: displayName,
    email,
    verified_email: false,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function markSenderVerified(senderId: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from('signedinbox_senders')
    .update({ verified_email: true, updated_at: new Date().toISOString() })
    .eq('id', senderId);
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function createEmailVerification(senderId: string): Promise<{ code: string }> {
  const db = getSupabaseAdmin();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.from('signedinbox_email_verifications')
    .delete()
    .eq('sender_id', senderId)
    .is('used_at', null);

  await db.from('signedinbox_email_verifications').insert({
    sender_id: senderId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return { code };
}

export async function verifyEmailCode(senderId: string, code: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const tokenHash = createHash('sha256').update(code).digest('hex');

  const { data, error } = await db.from('signedinbox_email_verifications')
    .select('*')
    .eq('sender_id', senderId)
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return false;

  await db.from('signedinbox_email_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id);

  await db.from('signedinbox_senders')
    .update({ verified_email: true, updated_at: new Date().toISOString() })
    .eq('id', senderId);

  return true;
}

// ─── Stamps ──────────────────────────────────────────────────────────────────

export async function createStampRecord(stamp: Omit<SignedInboxStamp, 'id' | 'created_at'>): Promise<SignedInboxStamp> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_stamps').insert(stamp).select('*').single();
  if (error) throw error;
  await db.rpc('increment_signedinbox_sender_stamps', { sender_uuid: stamp.sender_id });
  return data;
}

export async function getStamp(id: string): Promise<SignedInboxStamp | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_stamps').select('*').eq('id', id).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  return data;
}

export async function getStampWithSender(id: string): Promise<{ stamp: SignedInboxStamp; sender: SignedInboxSender } | null> {
  const stamp = await getStamp(id);
  if (!stamp) return null;
  const sender = await getSender(stamp.sender_id);
  if (!sender) return null;
  return { stamp, sender };
}

export async function listStamps(userId: string, limit = 50, offset = 0): Promise<{ stamps: SignedInboxStamp[]; total: number }> {
  const db = getSupabaseAdmin();
  const { count } = await db.from('signedinbox_stamps').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { data, error } = await db.from('signedinbox_stamps').select('*').eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return { stamps: data || [], total: count || 0 };
}

export async function revokeStamp(stampId: string, userId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('signedinbox_stamps').update({ revoked: true }).eq('id', stampId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

// ─── Validations ─────────────────────────────────────────────────────────────

export async function logValidation(
  stampId: string,
  isValid: boolean,
  failureReason: string | null,
  ipHash: string | null,
  userAgent: string | null,
  referrer: string | null,
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from('signedinbox_validations').insert({
    stamp_id: stampId,
    is_valid: isValid,
    failure_reason: failureReason,
    validator_ip_hash: ipHash,
    user_agent: userAgent,
    referrer: referrer,
  });
}

// ─── Signing Keys ────────────────────────────────────────────────────────────

export async function getActiveSigningKey(): Promise<SigningKey | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_signing_keys').select('*').eq('is_active', true).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  return data;
}

export async function getSigningKey(keyId: string): Promise<SigningKey | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_signing_keys').select('*').eq('key_id', keyId).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  return data;
}

export async function getAllSigningKeys(): Promise<SigningKey[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_signing_keys').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function storeSigningKey(keyId: string, publicKey: string, privateKeyEnc: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from('signedinbox_signing_keys').insert({
    key_id: keyId,
    public_key: publicKey,
    private_key_enc: privateKeyEnc,
    is_active: true,
  });
  await db.from('signedinbox_signing_keys')
    .update({ is_active: false, rotated_at: new Date().toISOString() })
    .eq('is_active', true)
    .neq('key_id', keyId);
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export async function getApiKeyByHash(keyHash: string): Promise<SignedInboxApiKey | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_api_keys').select('*').eq('key_hash', keyHash).eq('revoked', false).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  await db.from('signedinbox_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return data;
}

export async function listApiKeys(userId: string): Promise<SignedInboxApiKey[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_api_keys').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createApiKeyRecord(userId: string, name: string, keyHash: string, keyPrefix: string, scopes: string[]): Promise<SignedInboxApiKey> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('signedinbox_api_keys').insert({
    user_id: userId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('signedinbox_api_keys').update({ revoked: true }).eq('id', keyId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(userId: string, days: number): Promise<{
  total_stamps: number;
  total_validations: number;
  stamps_this_period: number;
  validations_this_period: number;
}> {
  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { count: totalStamps } = await db.from('signedinbox_stamps').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { count: periodStamps } = await db.from('signedinbox_stamps').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);

  const { data: stampIds } = await db.from('signedinbox_stamps').select('id').eq('user_id', userId);
  const ids = (stampIds || []).map((s: { id: string }) => s.id);

  let totalValidations = 0;
  let periodValidations = 0;
  if (ids.length > 0) {
    const { count: tv } = await db.from('signedinbox_validations').select('*', { count: 'exact', head: true }).in('stamp_id', ids);
    totalValidations = tv || 0;
    const { count: pv } = await db.from('signedinbox_validations').select('*', { count: 'exact', head: true }).in('stamp_id', ids).gte('validated_at', since);
    periodValidations = pv || 0;
  }

  return {
    total_stamps: totalStamps || 0,
    total_validations: totalValidations,
    stamps_this_period: periodStamps || 0,
    validations_this_period: periodValidations,
  };
}
