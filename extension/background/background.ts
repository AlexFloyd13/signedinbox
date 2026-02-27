/**
 * Service worker — handles all API calls, auth, and Turnstile coordination.
 * Content scripts communicate with this via chrome.runtime.sendMessage.
 */

import { signInWithPassword, signInWithIdToken, refreshSession, SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_CLIENT_ID } from '../lib/auth.js';
import { getAuth, setAuth, clearAuth, setActiveSenderId } from '../lib/storage.js';
import { getSenders, claimAuthEmail, createStamp } from '../lib/api.js';

// ─── Offscreen document ───────────────────────────────────────────────────────
// Pre-warmed at startup so Turnstile is ready before the user clicks.
// Token comes back in ~200ms once warm. Only falls back to visible popup
// if Cloudflare requires a human interaction challenge (very rare).

async function ensureOffscreenDocument() {
  const existing = await chrome.offscreen.hasDocument?.().catch(() => false);
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen/turnstile.html',
      reasons: ['IFRAME_SCRIPTING'],
      justification: 'Silently verify Cloudflare Turnstile for stamp creation',
    });
  }
}

// Pre-warm: load the offscreen iframe in the background so it's ready immediately
ensureOffscreenDocument().catch(() => {});

// Set by getTurnstileTokenSilent; fired by the TURNSTILE_NEEDS_INTERACTION handler
let _needsInteractionCallback: (() => void) | null = null;

async function getTurnstileTokenSilent(): Promise<string> {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    // Safety net for genuine network failures — not used for interaction detection
    const absoluteTimer = setTimeout(() => {
      _needsInteractionCallback = null;
      reject(new Error('Verification timed out'));
    }, 5_000);

    _needsInteractionCallback = () => {
      clearTimeout(absoluteTimer);
      _needsInteractionCallback = null;
      reject(new Error('Interactive challenge required'));
    };

    chrome.runtime.sendMessage({ type: 'GET_TURNSTILE_TOKEN' }, response => {
      clearTimeout(absoluteTimer);
      _needsInteractionCallback = null;
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (response?.error) return reject(new Error(response.error));
      resolve(response.token);
    });
  });
}

// ─── Challenge popup (fallback for interactive challenges only) ───────────────

let _challengeResolve: ((token: string) => void) | null = null;
let _challengeReject: ((err: Error) => void) | null = null;
let _challengeWindowId: number | null = null;

async function getTurnstileTokenPopup(): Promise<string> {
  if (_challengeWindowId !== null) {
    await chrome.windows.remove(_challengeWindowId).catch(() => {});
    _challengeWindowId = null;
  }

  return new Promise((resolve, reject) => {
    _challengeResolve = resolve;
    _challengeReject = reject;

    chrome.windows.create({
      url: chrome.runtime.getURL('challenge/challenge.html'),
      type: 'popup',
      width: 360,
      height: 160,
      focused: true,
    }).then(win => {
      _challengeWindowId = win?.id ?? null;

      const onRemoved = (removedId: number) => {
        if (removedId !== _challengeWindowId) return;
        chrome.windows.onRemoved.removeListener(onRemoved);
        _challengeWindowId = null;
        if (_challengeReject) {
          _challengeReject(new Error('Verification cancelled'));
          _challengeResolve = null;
          _challengeReject = null;
        }
      };
      chrome.windows.onRemoved.addListener(onRemoved);

      setTimeout(() => {
        if (_challengeReject) {
          _challengeReject(new Error('Verification timed out'));
          _challengeResolve = null;
          _challengeReject = null;
          if (_challengeWindowId !== null) {
            chrome.windows.remove(_challengeWindowId).catch(() => {});
            _challengeWindowId = null;
          }
        }
      }, 120_000);
    });
  });
}

// ─── Hybrid ───────────────────────────────────────────────────────────────────

async function getTurnstileToken(): Promise<string> {
  try {
    return await getTurnstileTokenSilent();
  } catch {
    // Only reaches here if Cloudflare explicitly signals it needs interaction,
    // or on a genuine network failure — never on a mere cold-start delay
    return await getTurnstileTokenPopup();
  }
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getValidToken(): Promise<string> {
  const auth = await getAuth();
  if (!auth) throw new Error('Not authenticated');

  // Attempt a refresh to get a fresh token
  try {
    const refreshed = await refreshSession(auth.refreshToken);
    await setAuth(refreshed);
    return refreshed.accessToken;
  } catch {
    // Refresh failed — user needs to log in again
    await clearAuth();
    throw new Error('Session expired — please sign in again');
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'SIGN_IN': {
          const auth = await signInWithPassword(message.email, message.password);
          await setAuth(auth);
          sendResponse({ success: true, email: auth.email });
          break;
        }

        case 'SIGN_IN_GOOGLE': {
          // Generate nonce for replay protection
          const rawNonce = crypto.randomUUID();
          const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
          const hashedNonce = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

          const redirectUrl = chrome.identity.getRedirectURL('oauth2');

          // Go directly to Google (not through Supabase) so the OAuth screen
          // shows Google's domain instead of the raw Supabase project URL.
          const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
          authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
          authUrl.searchParams.set('response_type', 'id_token');
          authUrl.searchParams.set('redirect_uri', redirectUrl);
          authUrl.searchParams.set('scope', 'openid email profile');
          authUrl.searchParams.set('nonce', hashedNonce);
          authUrl.searchParams.set('prompt', 'select_account');

          const responseUrl: string = await new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
              { url: authUrl.toString(), interactive: true },
              (url) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                if (!url) return reject(new Error('OAuth cancelled'));
                resolve(url);
              }
            );
          });

          // Extract id_token from the URL fragment
          const hash = new URL(responseUrl).hash.slice(1);
          const params = new URLSearchParams(hash);
          const idToken = params.get('id_token');
          if (!idToken) throw new Error('No ID token received from Google');

          // Exchange the Google ID token for a Supabase session
          const auth = await signInWithIdToken(idToken, rawNonce);
          await setAuth(auth);

          // Auto-provision verified sender from Google email — no manual verification needed
          await claimAuthEmail(auth.accessToken).catch(() => null);

          sendResponse({ success: true, email: auth.email });
          break;
        }

        case 'SIGN_OUT': {
          await clearAuth();
          sendResponse({ success: true });
          break;
        }

        case 'GET_AUTH': {
          const auth = await getAuth();
          sendResponse({ auth });
          break;
        }

        case 'GET_SENDERS': {
          const token = await getValidToken();
          let senders = await getSenders(token);
          // If no senders yet, auto-claim the signed-in email as a verified sender
          if (senders.length === 0) {
            const claimed = await claimAuthEmail(token).catch(() => null);
            if (claimed) senders = [claimed];
          }
          sendResponse({ senders });
          break;
        }

        case 'CREATE_STAMP': {
          const token = await getValidToken();

          // Auto-resolve sender if none selected in popup
          let senderId: string = message.senderId;
          if (!senderId) {
            const senders = await getSenders(token);
            const verified = senders.filter(s => s.verified_email);
            if (verified.length === 0) {
              throw new Error('No verified senders found. Visit signedinbox.com/dashboard to verify your email.');
            }
            senderId = verified[0].id;
            await setActiveSenderId(senderId);
          }

          // Hash recipient email client-side — plaintext never sent to the server
          const { recipientEmail, subjectHint, recipientCount = 1 } = message;
          let recipientEmailHash: string | undefined;
          if (recipientEmail) {
            const normalised = recipientEmail.toLowerCase().trim();
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalised));
            recipientEmailHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
          }

          // Compute content hash client-side — API never sees plaintext
          // Hash: SHA-256(senderId | recipientEmail | subject)
          let contentHash: string | undefined;
          if (recipientEmail && subjectHint) {
            const input = `${senderId}|${recipientEmail.toLowerCase()}|${subjectHint}`;
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
            contentHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
          }

          const isMassSend = recipientCount > 1;

          const turnstileToken = await getTurnstileToken();
          const stamp = await createStamp(token, senderId, turnstileToken, {
            recipientEmailHash,
            contentHash,
            isMassSend,
            declaredRecipientCount: isMassSend ? recipientCount : undefined,
          });
          sendResponse({ stamp });
          break;
        }

        case 'TURNSTILE_NEEDS_INTERACTION': {
          _needsInteractionCallback?.();
          sendResponse({ success: true });
          break;
        }

        case 'CHALLENGE_COMPLETE': {
          if (message.error) {
            _challengeReject?.(new Error(message.error));
            _challengeResolve = null;
            _challengeReject = null;
          } else {
            _challengeResolve?.(message.token);
            _challengeResolve = null;
            _challengeReject = null;
          }
          _challengeWindowId = null;
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: `Unknown message type: ${message.type}` });
      }
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
  })();

  return true; // keep channel open
});
