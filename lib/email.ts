/**
 * SendGrid email integration for sender verification OTPs.
 * No-ops gracefully when SENDGRID_API_KEY is not configured.
 */

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not configured — email sending is required in production');
    }
    console.warn('[email] SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not configured — skipping email (dev mode)');
    return;
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: 'Your signedinbox verification code',
      content: [
        {
          type: 'text/plain',
          value: `Your signedinbox verification code is: ${code}\n\nThis code expires in 15 minutes.`,
        },
        {
          type: 'text/html',
          value: `<p>Your signedinbox verification code is:</p><p style="font-size:2rem;font-weight:bold;letter-spacing:0.2em">${code}</p><p>This code expires in 15 minutes.</p>`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[email] SendGrid error', res.status, body);
    throw new Error(`Failed to send verification email (${res.status})`);
  }
}
