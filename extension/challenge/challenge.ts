/**
 * Challenge popup page — listens for Turnstile token from the signedinbox.com
 * iframe, forwards it to the background service worker, then closes the window.
 */

const FRAME_ORIGIN = 'https://signedinbox.com';

window.addEventListener('message', (event) => {
  if (event.origin !== FRAME_ORIGIN) return;

  if (event.data?.type === 'TURNSTILE_TOKEN') {
    chrome.runtime.sendMessage({ type: 'CHALLENGE_COMPLETE', token: event.data.token });
    window.close();
  } else if (event.data?.type === 'TURNSTILE_ERROR') {
    chrome.runtime.sendMessage({ type: 'CHALLENGE_COMPLETE', error: event.data.error });
    window.close();
  }
});
