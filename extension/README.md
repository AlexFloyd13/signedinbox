# SignedInbox Chrome Extension

Manifest V3 extension that injects a "Stamp" button into Gmail compose windows.

## Prerequisites

- Node.js 20+
- A Cloudflare Turnstile site configured for your extension's Chrome ID
  (add the extension ID to allowed hostnames in the Turnstile dashboard)

## Build

```bash
cd extension
npm install
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
TURNSTILE_SITE_KEY=your-site-key \
npm run build
```

Output lands in `dist/`. For development with auto-rebuild:

```bash
... npm run dev
```

## Install in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder
4. Note your extension ID — add it to the Turnstile site's allowed hostnames
5. Open Gmail, compose a new email, and click **✍️ Stamp** in the toolbar

## Architecture

```
popup.ts          → login/sender selector UI
background.ts     → service worker: API calls, auth, Turnstile coordination
gmail-content.ts  → Gmail compose detection + badge injection
offscreen/        → Cloudflare Turnstile rendering (offscreen document)
lib/              → typed API client, Supabase REST auth, storage helpers
```

The extension never skips Turnstile — stamps always require human verification.
