# Contributing to SignedInbox

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) site (Managed widget, free)
- Optionally: [SendGrid](https://sendgrid.com) for OTP emails (not required in dev)

### Setup

```bash
git clone https://github.com/your-username/signedinbox.git
cd signedinbox
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
# Generate encryption secrets
openssl rand -hex 32   # → ENCRYPTION_KEY
openssl rand -hex 32   # → API_KEY_HASH_SECRET
```

Apply database migrations to your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or paste supabase/migrations/*.sql into the Supabase SQL editor in order
```

Set `TURNSTILE_DEV_BYPASS=true` in `.env.local` to skip the CAPTCHA during development.

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Chrome Extension (optional)

```bash
cd extension
npm install
# Copy your env values:
SUPABASE_URL=... SUPABASE_ANON_KEY=... TURNSTILE_SITE_KEY=... npm run dev
```

Then in Chrome: go to `chrome://extensions`, enable Developer Mode, and click **Load unpacked** → select `extension/dist/`.

After loading, note your extension ID and add `chrome-extension://<your-id>` to allowed hostnames in your Cloudflare Turnstile widget settings.

## Making Changes

- Match the existing code style of whatever file you're editing
- TypeScript: prefer explicit types over `any`
- Keep functions small and single-purpose
- Prefer early returns over deeply nested conditionals
- If you add a new environment variable, update `.env.example`

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add sender display name validation
fix: handle expired Turnstile tokens gracefully
chore: update supabase-js to v2.98
```

Valid types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`

## Pull Requests

- Keep PRs focused — one concern per PR
- Include a clear description of what changed and why
- If your PR changes the database schema, include a migration file in `supabase/migrations/`
- Use the PR template checklist

## Security

If you find a security vulnerability, **do not open a public issue**. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
