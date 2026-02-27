-- Security hardening migration

-- 1. Make turnstile_token nullable — raw CAPTCHA tokens are single-use and don't
--    need to be stored permanently. Existing rows are preserved; new rows skip it.
ALTER TABLE signedinbox_stamps
  ALTER COLUMN turnstile_token DROP NOT NULL,
  ALTER COLUMN turnstile_token SET DEFAULT NULL;

-- 2. Restrict the SECURITY DEFINER counter function so anonymous and authenticated
--    roles cannot call it directly via the Supabase RPC API. Only the service_role
--    (server-side code) may increment stamp counts.
REVOKE EXECUTE ON FUNCTION increment_signedinbox_sender_stamps(UUID) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION increment_signedinbox_sender_stamps(UUID) TO service_role;
