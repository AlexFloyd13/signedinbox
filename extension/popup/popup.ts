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
  <defs>
    <linearGradient id="pBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6b9e7e" />
      <stop offset="100%" stop-color="#477857" />
    </linearGradient>
    <linearGradient id="pNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(255,255,255,0.98)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.88)" />
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="64" fill="url(#pBg)" />
  <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
  <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#pNib)" />
  <path d="M64 49 L64 113" stroke="#477857" stroke-width="5" stroke-linecap="round" />
  <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857" />
  <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none" stroke-linecap="round" />
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
      <div class="field">
        <label>Email</label>
        <input id="email" type="email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="password" type="password" autocomplete="current-password" />
      </div>
      ${errorMsg ? `<p class="error">${errorMsg}</p>` : ''}
      <button id="sign-in-btn" class="btn btn-primary">Sign in</button>
    </div>
  `;

  const signInBtn = document.getElementById('sign-in-btn') as HTMLButtonElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;

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
      <button id="sign-out-btn" class="btn btn-secondary" style="width:auto;padding:4px 10px;">Sign out</button>
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
    app.querySelector('.content')!.innerHTML += `<p class="error">Failed to load senders: ${err instanceof Error ? err.message : String(err)}</p>`;
    return;
  }

  const select = document.getElementById('sender-select') as HTMLSelectElement;
  const meta = document.getElementById('sender-meta') as HTMLParagraphElement;

  if (senders.length === 0) {
    select.innerHTML = '<option value="">No senders — create one in the dashboard</option>';
  } else {
    select.innerHTML = senders.map(s =>
      `<option value="${s.id}">${s.display_name} &lt;${s.email}&gt;${s.verified_email ? '' : ' (unverified)'}</option>`
    ).join('');
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
      ? `${sender.stamp_count} stamps`
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
  const { auth } = await sendMsg<{ auth: Auth | null }>({ type: 'GET_AUTH' });
  if (auth) {
    await renderMain();
  } else {
    renderLogin();
  }
})();
