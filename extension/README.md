# signedinbox Chrome Extension

Manifest V3 extension that injects a **Stamp** button into Gmail compose windows. When clicked, it calls the signedinbox API (with Cloudflare Turnstile verification) and inserts a signed HTML badge into the email body.

## Project layout

```
extension/
├── background/
│   └── background.ts       Service worker — auth, API calls, Turnstile coordination
├── challenge/
│   ├── challenge.html      Visible popup page shown only for interactive challenges
│   └── challenge.ts        Forwards Turnstile token from popup iframe to background
├── content/
│   ├── gmail-content.ts    Injects Stamp button into Gmail compose windows
│   └── gmail-content.css   Button styles (signedinbox brand palette)
├── lib/
│   ├── api.ts              Typed signedinbox API client
│   ├── auth.ts             Supabase REST auth (no SDK — service worker safe)
│   └── storage.ts          chrome.storage helpers
├── offscreen/
│   ├── turnstile.html      Hidden offscreen document — hosts Turnstile iframe
│   └── turnstile.ts        Token cache + pre-fetch logic
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
Extension loads
  └─ background.ts pre-warms the offscreen document immediately
       └─ offscreen iframe loads signedinbox.com/turnstile-frame
            └─ Turnstile runs silently, token cached in memory (~1-2s)

User clicks Stamp
  └─ gmail-content.ts
       └─ chrome.runtime.sendMessage(CREATE_STAMP)
            └─ background.ts (service worker)
                 ├─ refreshSession()      — get fresh Supabase JWT
                 ├─ getTurnstileToken()   — hybrid Turnstile flow (see below)
                 └─ createStamp()         — POST /api/v1/stamps
                      └─ badge_html injected into Gmail compose body
```

### Turnstile hybrid flow

Stamp creation is designed to be completely invisible to the user in normal conditions:

1. **Cached token (instant)** — the offscreen document pre-fetches a token when the
   extension loads. The first click consumes the cached token immediately (~0ms),
   then a new token is pre-fetched for the next click.

2. **Silent re-fetch (~200ms)** — if the cached token was used or expired (4-min TTL),
   the offscreen iframe calls `turnstile.reset()`. The Cloudflare JS is already loaded,
   so the re-analysis takes ~200ms. No UI shown.

3. **Visible challenge popup (rare)** — if Cloudflare determines a human checkbox is
   required, `before-interactive-callback` fires on the `turnstile-frame` page, which
   immediately signals the background to open `challenge/challenge.html` as a small
   popup window. The user completes the checkbox, the popup closes, and the stamp is
   created. This path only triggers when Cloudflare genuinely suspects suspicious
   activity — normal users never see it.

4. **Absolute fallback (5s timeout)** — if the offscreen fails to respond at all
   (e.g. network down, offscreen killed by Chrome under memory pressure), the 5-second
   safety timer fires and opens the challenge popup as a last resort.

Each token is single-use — Cloudflare rejects replays at `siteverify`. The extension
never skips Turnstile — every stamp requires human verification.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the step-by-step Chrome Web Store submission guide.
