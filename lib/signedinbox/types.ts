export interface SignedInboxSender {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  verified_email: boolean;
  total_stamps: number;
  created_at: string;
  updated_at: string;
}

export interface SignedInboxStamp {
  id: string;
  sender_id: string;
  user_id: string;
  recipient_email_hash: string | null;
  turnstile_token: string;
  turnstile_valid: boolean;
  signature: string;
  public_key_id: string;
  verification_method: string;
  client_type: string;
  ip_hash: string | null;
  expires_at: string;
  revoked: boolean;
  canonical_payload: string | null;
  content_hash: string | null;
  is_mass_send: boolean;
  declared_recipient_count: number | null;
  created_at: string;
}

export interface SignedInboxApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_rpm: number;
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface SigningKey {
  key_id: string;
  public_key: string;
  private_key_enc: string;
  is_active: boolean;
  created_at: string;
  rotated_at: string | null;
}

export interface StampPayload {
  v: number;
  sid: string;
  sender: string;
  email: string;
  rcpt: string;
  ch: string;
  ts: number;
  exp: number;
  nonce: string;
}

export interface StampResponse {
  stamp_id: string;
  stamp_url: string;
  badge_html: string;
  badge_text: string;
  signature: string;
  expires_at: string;
  created_at: string;
  content_hash: string | null;
}

export interface StampValidationResult {
  valid: boolean;
  stamp: {
    id: string;
    sender_name: string;
    sender_email_masked: string;
    verification_method: string;
    created_at: string;
    expires_at: string;
    content_hash: string | null;
    is_mass_send: boolean;
    declared_recipient_count: number | null;
  } | null;
  signature_verified: boolean;
  failure_reason: string | null;
  validation_count: number;
  recipient_email_hash: string | null;
}
