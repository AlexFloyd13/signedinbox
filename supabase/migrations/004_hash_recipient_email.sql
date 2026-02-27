-- Migration: Replace plaintext recipient_email and subject_hint with recipient_email_hash
-- Recipient emails are now hashed server-side before storage; subject is never stored.

ALTER TABLE signedinbox_stamps
  ADD COLUMN IF NOT EXISTS recipient_email_hash TEXT;

-- Migrate existing rows: hash any stored plaintext emails
-- (requires pgcrypto, available in Supabase by default)
UPDATE signedinbox_stamps
SET recipient_email_hash = encode(digest(lower(trim(recipient_email)), 'sha256'), 'hex')
WHERE recipient_email IS NOT NULL;

ALTER TABLE signedinbox_stamps
  DROP COLUMN IF EXISTS recipient_email,
  DROP COLUMN IF EXISTS subject_hint;
