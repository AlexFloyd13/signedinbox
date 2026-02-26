/**
 * Service worker — handles all API calls, auth, and Turnstile coordination.
 * Content scripts communicate with this via chrome.runtime.sendMessage.
 */

import { signInWithPassword, refreshSession } from '../lib/auth.js';
import { getAuth, setAuth, clearAuth } from '../lib/storage.js';
import { getSenders, createStamp } from '../lib/api.js';

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
          const senders = await getSenders(token);
          sendResponse({ senders });
          break;
        }

        case 'CREATE_STAMP': {
          const token = await getValidToken();
          const turnstileToken = await getTurnstileToken();
          const stamp = await createStamp(token, message.senderId, turnstileToken, {
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
