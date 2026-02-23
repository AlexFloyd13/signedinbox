-- SignedInbox Initial Schema
-- Run this in your Supabase SQL editor

-- ─── Senders ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signedinbox_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  verified_email BOOLEAN NOT NULL DEFAULT false,
  total_stamps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_si_senders_user ON signedinbox_senders(user_id);
ALTER TABLE signedinbox_senders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own senders" ON signedinbox_senders
  USING (auth.uid() = user_id);

-- ─── Email Verifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signedinbox_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES signedinbox_senders(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_si_email_verif_sender ON signedinbox_email_verifications(sender_id);
ALTER TABLE signedinbox_email_verifications ENABLE ROW LEVEL SECURITY;

-- ─── Signing Keys ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signedinbox_signing_keys (
  key_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  private_key_enc TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);

-- ─── Stamps ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signedinbox_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES signedinbox_senders(id),
  user_id UUID NOT NULL,
  recipient_email TEXT,
  subject_hint TEXT,
  turnstile_token TEXT NOT NULL,
  turnstile_valid BOOLEAN NOT NULL DEFAULT true,
  signature TEXT NOT NULL,
  public_key_id TEXT NOT NULL REFERENCES signedinbox_signing_keys(key_id),
  verification_method TEXT NOT NULL DEFAULT 'turnstile',
  client_type TEXT NOT NULL DEFAULT 'web',
  ip_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  canonical_payload TEXT,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_si_stamps_user ON signedinbox_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_si_stamps_sender ON signedinbox_stamps(sender_id);
ALTER TABLE signedinbox_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own stamps" ON signedinbox_stamps
  USING (auth.uid() = user_id);

-- ─── Validations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signedinbox_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stamp_id UUID NOT NULL REFERENCES signedinbox_stamps(id),
  is_valid BOOLEAN NOT NULL,
  failure_reason TEXT,
  validator_ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_si_validations_stamp ON signedinbox_validations(stamp_id);

-- ─── API Keys ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signedinbox_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['stamp:create', 'stamp:validate'],
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_si_api_keys_user ON signedinbox_api_keys(user_id);
ALTER TABLE signedinbox_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON signedinbox_api_keys
  USING (auth.uid() = user_id);

-- ─── Atomic counter function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_signedinbox_sender_stamps(sender_uuid UUID)
RETURNS void AS $$
  UPDATE signedinbox_senders
  SET total_stamps = total_stamps + 1, updated_at = now()
  WHERE id = sender_uuid;
$$ LANGUAGE sql SECURITY DEFINER;
