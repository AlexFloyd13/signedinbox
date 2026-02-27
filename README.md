# SignedInbox

![CI](https://github.com/AlexFloyd13/signedinbox/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

**Cryptographic proof that a human sent your email.**

SignedInbox lets senders attach a tamper-evident digital stamp to emails. Each stamp is signed with Ed25519, gated by a Cloudflare Turnstile CAPTCHA (bot proof), and verifiable by anyone via a public URL — no account required to verify.

## How It Works

1. **Register a sender** — add your email address and verify it via OTP
2. **Create a stamp** — pass a Turnstile CAPTCHA to prove you're human; the server signs a payload with your sender identity and timestamps it
3. **Attach the badge** — copy the HTML badge snippet and paste it into your email
4. **Recipient verifies** — click the badge link; the server checks the Ed25519 signature, revocation status, and expiry in real time
5. **Trust is established** — the recipient sees your verified identity, the timestamp, and whether the stamp is still valid

## Cryptography

- **Ed25519** — stamps are signed with rotating Ed25519 keypairs stored in the database (private keys encrypted with AES-256-GCM)
- **AES-256-GCM** — private key encryption at rest using `ENCRYPTION_KEY`
- **SHA-256 content binding** — optional `content_hash` field binds the stamp to specific email content; tampering invalidates the stamp
- **HMAC-SHA-256** — API keys hashed before storage using `API_KEY_HASH_SECRET`
- **Key transparency** — all public keys are stored and addressable by `key_id`; old keys are retained after rotation so historical stamps remain verifiable

## Self-Hosting

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) site (Managed widget type)

### Setup

```bash
git clone https://github.com/your-username/signedinbox.git
cd signedinbox
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_URL` | Yes | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for Ed25519 private key encryption (`openssl rand -hex 32`) |
| `API_KEY_HASH_SECRET` | Yes | HMAC secret for API key hashing (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes (prod) | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Yes (prod) | Cloudflare Turnstile secret key |
| `TURNSTILE_DEV_BYPASS` | Dev only | Set to `true` to skip Turnstile in development — **never set in production** |
| `NEXT_PUBLIC_SITE_URL` | Yes | Your deployment URL (e.g. `https://signedinbox.com`) |
| `SENDGRID_API_KEY` | Optional | SendGrid API key for OTP emails |
| `SENDGRID_FROM_EMAIL` | Optional | Sender address for OTP emails |
| `CORS_ALLOWED_ORIGINS` | Optional | Comma-separated extra allowed CORS origins |

### Database Schema

Apply the Supabase migrations in `supabase/migrations/`:

```bash
supabase db push
```

Key tables:

| Table | Purpose |
|-------|---------|
| `signedinbox_senders` | Registered sender identities |
| `signedinbox_email_verifications` | OTP codes for sender verification |
| `signedinbox_stamps` | Created stamps (signed payloads) |
| `signedinbox_validations` | Validation audit log |
| `signedinbox_signing_keys` | Ed25519 keypairs (private keys encrypted) |
| `signedinbox_api_keys` | API key records (keys stored as HMAC hash) |

## API Reference

All endpoints under `/api/v1/`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/stamps` | JWT or API key | Create stamp, sender, API key, verify email |
| `GET` | `/api/v1/stamps` | JWT or API key | List stamps, senders, stats, API keys |
| `GET` | `/api/v1/stamps/:id` | None | Validate a stamp (public) |

### POST /api/v1/stamps — Actions

Send `{ "action": "<action>", ... }` in the request body.

| Action | Description |
|--------|-------------|
| `create-sender` | Register a new sender identity |
| `send-verification` | Send OTP code to sender's email |
| `verify-email` | Confirm OTP and mark sender as verified |
| `create-api-key` | Issue a new API key |
| `revoke` | Revoke a stamp |
| *(no action)* | Create a stamp (requires Turnstile token) |

### GET /api/v1/stamps — Query Parameters

| `?action=` | Description |
|-----------|-------------|
| `senders` | List your senders |
| `stats` | Usage statistics (`?days=30`) |
| `api-keys` | List your API keys |
| *(none)* | List your stamps |

## Chrome Extension

The `extension/` directory contains a Manifest V3 Chrome extension for Gmail. It injects a **Stamp** button into Gmail compose windows, handles Cloudflare Turnstile verification via an offscreen document, and inserts the signed badge HTML directly into the email body.

- `extension/README.md` — build and local development instructions
- `extension/DEPLOY.md` — Chrome Web Store submission guide

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** (auth + PostgreSQL)
- **Cloudflare Turnstile** (bot protection)
- **Ed25519** via Node.js `crypto` module
- **Tailwind CSS v4**
- **Vercel** (deployment)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
