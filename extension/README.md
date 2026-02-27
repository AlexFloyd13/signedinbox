# signedinbox Chrome Extension

Manifest V3 extension that injects a **Stamp** button into Gmail compose windows. When clicked, it calls the signedinbox API (with Cloudflare Turnstile verification) and inserts a signed HTML badge into the email body.

## Project layout

```
extension/
├── background/
│   └── background.ts       Service worker — auth, API calls, Turnstile coordination
├── content/
│   ├── gmail-content.ts    Injects Stamp button into Gmail compose windows
│   └── gmail-content.css   Button styles (signedinbox brand palette)
├── lib/
│   ├── api.ts              Typed signedinbox API client
│   ├── auth.ts             Supabase REST auth (no SDK — service worker safe)
│   └── storage.ts          chrome.storage helpers
├── offscreen/
│   ├── turnstile.html      Offscreen document for Cloudflare Turnstile
│   └── turnstile.ts        Turnstile token handler
├── popup/
│   ├── popup.html          Extension popup shell
│   ├── popup.css           Popup styles (signedinbox brand palette)
│   └── popup.ts            Login view + sender selector
├── icons/
│   ├── icon.svg            Source icon (brand SVG)
│   └── generate.js         Icon generation — called automatically by build.js
├── build.js                esbuild bundler script
├── manifest.json           Extension manifest (MV3)
└── tsconfig.json
```

## Prerequisites

- Node.js 20+
- A Cloudflare Turnstile **Managed** widget configured for your extension's Chrome ID
  (after you get your extension ID, add `chrome-extension://<ID>` to the Turnstile site's allowed hostnames)

## Environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://abcxyz.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |

These are baked into the bundle at build time. esbuild replaces the `__SUPABASE_URL__`, `__SUPABASE_ANON_KEY__`, and `__TURNSTILE_SITE_KEY__` identifiers with the values of these env vars. Set them in your shell or CI before running `npm run build` — they are **not** read at runtime.

## Build

```bash
cd extension
npm install

# Development build (with sourcemaps, no minification, auto-rebuild on changes)
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
TURNSTILE_SITE_KEY=your-site-key \
npm run dev

# Production build (minified, no sourcemaps)
NODE_ENV=production \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
TURNSTILE_SITE_KEY=your-site-key \
npm run build
```

Output lands in `dist/`. Icons are generated automatically from `icons/icon.svg` if the PNGs are missing.

## Load in Chrome (development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. Copy the extension ID shown on the card (e.g. `abcdefghijklmnopabcdefghijklmnop`)
5. Add `chrome-extension://<your-extension-id>` to the Turnstile site's **allowed hostnames** in the Cloudflare dashboard
6. Open Gmail, compose a new email — the **Stamp** button appears in the compose toolbar

## How it works

```
User clicks Stamp
  └─ gmail-content.ts
       └─ chrome.runtime.sendMessage(CREATE_STAMP)
            └─ background.ts (service worker)
                 ├─ refreshSession()     — get fresh Supabase JWT
                 ├─ getTurnstileToken()  — render Turnstile in offscreen document
                 └─ createStamp()        — POST /api/v1/stamps
                      └─ badge_html injected into Gmail compose body
```

The extension never skips Turnstile — every stamp requires human verification.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the step-by-step Chrome Web Store submission guide.
