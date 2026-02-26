# Chrome Web Store Deployment Guide

Step-by-step instructions for publishing the signedinbox extension.

---

## 1. One-time account setup

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with the Google account that will own the extension
3. Pay the **$5 one-time registration fee**
4. Accept the Developer Agreement

---

## 2. Pre-submission checklist

Before building, confirm:

- [ ] `manifest.json` version is bumped (e.g. `"version": "1.0.0"`)
- [ ] All three icon sizes exist: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
  - Run `npm run icons` to generate them if missing
- [ ] Turnstile site key in your build env is the **production** key (not a test key)
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` point to production Supabase

---

## 3. Production build

```bash
cd extension
npm install

NODE_ENV=production \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
TURNSTILE_SITE_KEY=your-production-turnstile-site-key \
npm run build
```

Verify `dist/` contains:

```
dist/
├── manifest.json
├── background/background.js
├── content/gmail-content.js
├── content/gmail-content.css
├── offscreen/turnstile.html
├── offscreen/turnstile.js
├── popup/popup.html
├── popup/popup.css
├── popup/popup.js
└── icons/icon16.png  icon48.png  icon128.png
```

---

## 4. Create the ZIP

The ZIP must contain the **contents** of `dist/` — not the `dist/` folder itself.

```bash
cd dist
zip -r ../signedinbox-extension.zip .
cd ..
```

Verify the ZIP root contains `manifest.json` (not a nested `dist/manifest.json`):

```bash
unzip -l signedinbox-extension.zip | head -20
```

---

## 5. Create the listing

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New item** → upload `signedinbox-extension.zip`
3. Fill in the **Store listing** tab:

### Suggested copy

**Name:** signedinbox

**Summary (132 chars max):**
> Attach a cryptographic proof-of-humanity stamp to your Gmail emails. Verifiable by anyone, no account required.

**Description:**
> signedinbox lets you prove you're a real human when you send email.
>
> When you compose a message in Gmail, click the Stamp button in the toolbar. signedinbox generates a tamper-evident Ed25519 signature tied to your verified identity and embeds a badge in your email. Recipients can click the badge to verify it in real time — no account needed.
>
> Features:
> • One-click stamping from the Gmail compose toolbar
> • Ed25519 cryptographic signatures — tamper-evident and verifiable
> • Cloudflare Turnstile human verification — no bots
> • Badge injected directly into the email body
> • Works with your existing signedinbox.com account

**Category:** Productivity

**Language:** English (United States)

### Screenshots (required)

You'll need at least one 1280×800 or 640×400 screenshot. Recommended:
- The Gmail compose window with the Stamp button visible in the toolbar
- The popup (sign-in view and sender selector view)
- An email with the badge injected

### Store icon

Upload `icons/icon128.png` as the **store icon** (128×128).

---

## 6. Privacy policy (required)

The extension accesses `mail.google.com` and handles user credentials, so Google requires a privacy policy URL.

Add a `/privacy` page to `signedinbox.com` (or link to the existing one) and paste that URL into the **Privacy practices** tab.

Minimum content to cover:
- What data the extension collects (email address, Supabase JWT stored in `chrome.storage.local`)
- What it sends to signedinbox.com and Cloudflare (Turnstile tokens, stamp creation requests)
- That it does not read email content (it only reads the To/Subject fields when you click Stamp)
- How to delete your data (delete your signedinbox.com account)

---

## 7. Permissions justification

The Chrome Web Store will ask you to justify each permission. Use these:

| Permission | Justification |
|------------|---------------|
| `activeTab` | Required to inject the Stamp button into the Gmail compose window |
| `storage` | Stores the user's session token and selected sender ID locally |
| `offscreen` | Renders the Cloudflare Turnstile CAPTCHA in an offscreen document (service workers cannot render iframes) |
| `https://mail.google.com/*` | Injects the content script into Gmail |
| `https://signedinbox.com/api/*` | Calls the signedinbox API to create stamps and fetch senders |
| `https://challenges.cloudflare.com/*` | Loads the Cloudflare Turnstile CAPTCHA widget |

---

## 8. Submit for review

1. Complete all tabs: **Store listing**, **Privacy practices**, **Distribution**
2. Set distribution to **Public** (or **Unlisted** for a soft launch)
3. Click **Submit for review**

Review typically takes **1–3 business days** for a new extension. Google may ask for clarification on permissions or policy compliance — respond promptly to avoid delays.

---

## 9. After approval — configure Turnstile

Once the extension is approved and published, you'll have a permanent extension ID. Update your Cloudflare Turnstile site:

1. Go to [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Select your signedinbox site
3. Under **Allowed Hostnames**, add:
   ```
   chrome-extension://<your-extension-id>
   ```
4. Save

The extension ID is shown in the Chrome Web Store Developer Dashboard and in `chrome://extensions` when the extension is installed.

---

## 10. Publishing updates

For every subsequent release:

1. Bump `"version"` in `manifest.json` (must be higher than the published version)
2. Rebuild with `NODE_ENV=production npm run build`
3. Re-zip: `cd dist && zip -r ../signedinbox-extension-vX.Y.Z.zip . && cd ..`
4. In the Developer Dashboard, click **Upload new package** on the existing item
5. Submit for review — updates typically review faster than initial submissions

---

## Rollback

If a published update causes issues:
- Go to the Developer Dashboard → your item → **Package** tab
- You can unpublish the current version, which removes it from new installs
- Existing users keep the installed version until you publish a fix
- There is no direct "rollback to previous version" — you must publish a new version with a higher version number

---

## Useful links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store policy](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
