const API_BASE = 'https://signedinbox.com/api/v1';

export interface Sender {
  id: string;
  display_name: string;
  email: string;
  verified_email: boolean;
  stamp_count: number;
}

export interface StampResponse {
  id: string;
  badge_html: string;
  verify_url: string;
  expires_at: string;
}

export async function getSenders(accessToken: string): Promise<Sender[]> {
  const res = await fetch(`${API_BASE}/stamps?action=senders`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch senders');
  const data = await res.json();
  return data.senders;
}

export async function claimAuthEmail(accessToken: string): Promise<Sender | null> {
  const res = await fetch(`${API_BASE}/stamps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'claim-auth-email' }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sender ?? null;
}

export async function createStamp(
  accessToken: string,
  senderId: string,
  turnstileToken: string,
  opts: {
    recipientEmail?: string;
    contentHash?: string;
    isMassSend?: boolean;
    declaredRecipientCount?: number;
  } = {}
): Promise<StampResponse> {
  const res = await fetch(`${API_BASE}/stamps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      sender_id: senderId,
      turnstile_token: turnstileToken,
      client_type: 'chrome_extension',
      ...(opts.recipientEmail && { recipient_email: opts.recipientEmail }),
      ...(opts.contentHash && { content_hash: opts.contentHash }),
      ...(opts.isMassSend && { is_mass_send: true }),
      ...(opts.declaredRecipientCount && { declared_recipient_count: opts.declaredRecipientCount }),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create stamp');
  }

  return res.json();
}
