/**
 * Popup — login view and main view (sender selector + controls).
 * Communicates with the background service worker via chrome.runtime.sendMessage.
 */

interface Sender {
  id: string;
  display_name: string;
  email: string;
  verified_email: boolean;
  stamp_count: number;
}

interface Auth {
  email: string;
  accessToken: string;
}

const app = document.getElementById('app')!;

/** Escape a string for safe insertion into HTML attributes or text. */
function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sendMsg<T>(msg: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response: T & { error?: string }) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (response?.error) return reject(new Error(response.error));
      resolve(response);
    });
  });
}

// ─── Login view ───────────────────────────────────────────────────────────────

const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="64" fill="#5a9471"/>
  <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
  <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="#ffffff"/>
  <path d="M64 49 L64 113" stroke="#477857" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857"/>
  <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

const GOOGLE_SVG = `<svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;

function renderLogin(errorMsg = '') {
  app.innerHTML = `
    <div class="header">
      <span class="header-logo">${LOGO_SVG}</span>
      <div>
        <div class="header-title">signedinbox</div>
        <div class="header-subtitle">Sign in to stamp emails</div>
      </div>
    </div>
    <div class="content">
      <button id="sign-in-google-btn" class="btn-google">${GOOGLE_SVG} Continue with Google</button>
      <div class="divider">or</div>
      <div class="field">
        <label>Email</label>
        <input id="email" type="email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="password" type="password" autocomplete="current-password" />
      </div>
      ${errorMsg ? `<p class="error">${esc(errorMsg)}</p>` : ''}
      <button id="sign-in-btn" class="btn btn-primary">Sign in</button>
    </div>
  `;

  const signInBtn = document.getElementById('sign-in-btn') as HTMLButtonElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const googleBtn = document.getElementById('sign-in-google-btn') as HTMLButtonElement;

  googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    googleBtn.innerHTML = `${GOOGLE_SVG} Signing in...`;
    try {
      await sendMsg({ type: 'SIGN_IN_GOOGLE' });
      await renderMain();
    } catch (err) {
      renderLogin(err instanceof Error ? err.message : 'Google sign in failed');
    }
  });

  signInBtn.addEventListener('click', async () => {
    signInBtn.disabled = true;
    signInBtn.textContent = 'Signing in...';
    try {
      await sendMsg({ type: 'SIGN_IN', email: emailInput.value, password: passwordInput.value });
      await renderMain();
    } catch (err) {
      renderLogin(err instanceof Error ? err.message : 'Sign in failed');
    }
  });
}

// ─── Main view ────────────────────────────────────────────────────────────────

async function renderMain() {
  app.innerHTML = `
    <div class="header">
      <span class="header-logo">${LOGO_SVG}</span>
      <div>
        <div class="header-title">signedinbox</div>
        <div class="header-subtitle">Ready to stamp</div>
      </div>
    </div>
    <div class="content">
      <div class="field">
        <label>Active sender</label>
        <select id="sender-select"><option value="">Loading...</option></select>
        <p id="sender-meta" class="meta"></p>
      </div>
    </div>
    <div class="footer">
      <a href="https://signedinbox.com/dashboard" target="_blank">Dashboard</a>
      <button id="sign-out-btn" class="btn btn-secondary btn-compact">Sign out</button>
    </div>
  `;

  // Load auth info
  const { auth } = await sendMsg<{ auth: Auth | null }>({ type: 'GET_AUTH' });
  if (!auth) { renderLogin(); return; }

  // Load senders
  let senders: Sender[] = [];
  try {
    const res = await sendMsg<{ senders: Sender[] }>({ type: 'GET_SENDERS' });
    senders = res.senders;
  } catch (err) {
    const errEl = document.createElement('p');
    errEl.className = 'error';
    errEl.textContent = `Failed to load senders: ${err instanceof Error ? err.message : String(err)}`;
    app.querySelector('.content')!.appendChild(errEl);
    return;
  }

  const select = document.getElementById('sender-select') as HTMLSelectElement;
  const meta = document.getElementById('sender-meta') as HTMLParagraphElement;

  // Build option elements safely via DOM APIs to avoid innerHTML XSS
  select.innerHTML = '';
  if (senders.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No senders — create one in the dashboard';
    select.appendChild(opt);
  } else {
    for (const s of senders) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.display_name} <${s.email}>${s.verified_email ? '' : ' (unverified)'}`;
      select.appendChild(opt);
    }
  }

  // Restore previously selected sender
  const stored = await chrome.storage.local.get('activeSenderId');
  if (stored.activeSenderId && senders.find(s => s.id === stored.activeSenderId)) {
    select.value = stored.activeSenderId;
  }

  function updateMeta() {
    const sender = senders.find(s => s.id === select.value);
    if (!sender) { meta.textContent = ''; return; }
    meta.textContent = sender.verified_email
      ? `${sender.stamp_count ?? 0} stamps`
      : 'Email not verified — verify in the dashboard before stamping';
    chrome.storage.local.set({ activeSenderId: sender.id });
  }

  select.addEventListener('change', updateMeta);
  updateMeta();

  document.getElementById('sign-out-btn')!.addEventListener('click', async () => {
    await sendMsg({ type: 'SIGN_OUT' });
    renderLogin();
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const { auth } = await sendMsg<{ auth: Auth | null }>({ type: 'GET_AUTH' });
    if (auth) {
      await renderMain();
    } else {
      renderLogin();
    }
  } catch {
    renderLogin();
  }
})();
