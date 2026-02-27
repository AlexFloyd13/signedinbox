/**
 * Offscreen document that renders the Cloudflare Turnstile widget.
 * Runs in an isolated page context where the Turnstile SDK can load normally.
 */

declare const turnstile: {
  render: (container: string | HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    'error-callback': (err: unknown) => void;
    'expired-callback': () => void;
    appearance: string;
    theme: string;
  }) => string;
};

// Injected by esbuild define at build time (see build.js).
declare const __TURNSTILE_SITE_KEY__: string;

const SITE_KEY = __TURNSTILE_SITE_KEY__;

let resolveToken: ((token: string) => void) | null = null;
let rejectToken: ((err: Error) => void) | null = null;

function renderTurnstile() {
  turnstile.render('#turnstile-container', {
    sitekey: SITE_KEY,
    callback(token: string) {
      resolveToken?.(token);
      resolveToken = null;
      rejectToken = null;
    },
    'error-callback'(err: unknown) {
      rejectToken?.(new Error(`Turnstile error: ${String(err)}`));
      resolveToken = null;
      rejectToken = null;
    },
    'expired-callback'() {
      rejectToken?.(new Error('Turnstile token expired'));
      resolveToken = null;
      rejectToken = null;
    },
    appearance: 'interaction-only',
    theme: 'light',
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'GET_TURNSTILE_TOKEN') return;

  new Promise<string>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;

    // Turnstile SDK may not be loaded yet; poll until ready
    const tryRender = () => {
      if (typeof turnstile !== 'undefined') {
        renderTurnstile();
      } else {
        setTimeout(tryRender, 100);
      }
    };
    tryRender();
  })
    .then(token => sendResponse({ token }))
    .catch(err => sendResponse({ error: String(err) }));

  return true; // keep message channel open for async response
});
