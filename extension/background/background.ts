/**
 * Service worker — handles all API calls, auth, and Turnstile coordination.
 * Content scripts communicate with this via chrome.runtime.sendMessage.
 */

import { signInWithPassword, refreshSession, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/auth.js';
import { getAuth, setAuth, clearAuth, setActiveSenderId } from '../lib/storage.js';
import { getSenders, claimAuthEmail, createStamp } from '../lib/api.js';

// ─── Offscreen document ───────────────────────────────────────────────────────

async function ensureOffscreenDocument() {
  const existing = await chrome.offscreen.hasDocument?.().catch(() => false);
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen/turnstile.html',
      reasons: ['IFRAME_SCRIPTING'],
      justification: 'Render Cloudflare Turnstile CAPTCHA for stamp creation',
    });
  }
}

async function getTurnstileToken(): Promise<string> {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_TURNSTILE_TOKEN' }, response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (response?.error) return reject(new Error(response.error));
      resolve(response.token);
    });
  });
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
          const redirectUrl = chrome.identity.getRedirectURL('oauth2');

          const authUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
          authUrl.searchParams.set('provider', 'google');
          authUrl.searchParams.set('redirect_to', redirectUrl);

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

          const hash = new URL(responseUrl).hash.slice(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (!accessToken || !refreshToken) throw new Error('OAuth response missing tokens');

          const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              apikey: SUPABASE_ANON_KEY,
            },
          });
          if (!userRes.ok) throw new Error('Failed to fetch user after OAuth');

          const userData = await userRes.json();
          const auth = {
            accessToken,
            refreshToken,
            email: userData.email as string,
            userId: userData.id as string,
          };

          await setAuth(auth);

          // Auto-provision verified sender from Google email — no manual verification needed
          await claimAuthEmail(accessToken).catch(() => null);

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

          const turnstileToken = await getTurnstileToken();
          const stamp = await createStamp(token, senderId, turnstileToken, {
            recipientEmail: message.recipientEmail,
            subjectHint: message.subjectHint,
          });
          sendResponse({ stamp });
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
