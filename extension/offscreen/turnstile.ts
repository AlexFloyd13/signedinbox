/**
 * Offscreen document — caches the Turnstile token that fires automatically
 * when the iframe loads, so stamp creation is instant on click.
 * After each use, immediately pre-fetches the next token.
 */

const FRAME_ORIGIN = 'https://signedinbox.com';
const TOKEN_TTL_MS = 4 * 60 * 1000; // 4 min (Cloudflare tokens valid 5 min)

let cachedToken: string | null = null;
let cachedTokenAt = 0;
let pendingResolve: ((token: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

function getFrame(): HTMLIFrameElement | null {
  return document.getElementById('turnstile-frame') as HTMLIFrameElement | null;
}

function requestFreshToken() {
  const tryRequest = () => {
    const frame = getFrame();
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage({ type: 'REQUEST_TOKEN' }, FRAME_ORIGIN);
    } else {
      setTimeout(tryRequest, 100);
    }
  };
  tryRequest();
}

window.addEventListener('message', (event) => {
  if (event.origin !== FRAME_ORIGIN) return;

  if (event.data?.type === 'TURNSTILE_TOKEN') {
    const token = event.data.token as string;
    if (pendingResolve) {
      // Fulfil a waiting GET_TURNSTILE_TOKEN request
      pendingResolve(token);
      pendingResolve = null;
      pendingReject = null;
      // Pre-fetch next token so the following click is also instant
      requestFreshToken();
    } else {
      // Token arrived with no pending request (pre-warm or post-use refresh)
      cachedToken = token;
      cachedTokenAt = Date.now();
    }
  } else if (event.data?.type === 'TURNSTILE_NEEDS_INTERACTION') {
    // Cloudflare needs a visible checkbox — forward to background so it can
    // open the challenge popup immediately instead of waiting on a timeout
    chrome.runtime.sendMessage({ type: 'TURNSTILE_NEEDS_INTERACTION' });
  } else if (event.data?.type === 'TURNSTILE_ERROR') {
    if (pendingReject) {
      pendingReject(new Error(`Turnstile error: ${event.data.error}`));
      pendingResolve = null;
      pendingReject = null;
    } else {
      // Cached token expired — clear it
      cachedToken = null;
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'GET_TURNSTILE_TOKEN') return;

  // Serve cached token if still within TTL
  if (cachedToken && Date.now() - cachedTokenAt < TOKEN_TTL_MS) {
    const token = cachedToken;
    cachedToken = null;
    sendResponse({ token });
    // Pre-fetch for next click
    requestFreshToken();
    return true;
  }

  // No fresh cached token — reset the widget and wait
  cachedToken = null;
  new Promise<string>((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    requestFreshToken();
  })
    .then((token) => sendResponse({ token }))
    .catch((err) => sendResponse({ error: String(err) }));

  return true;
});
