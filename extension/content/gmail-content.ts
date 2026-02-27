/**
 * Gmail content script — detects compose windows, injects Stamp button,
 * and inserts the badge HTML into the email body.
 */

const COMPOSE_SELECTOR = 'div[role="dialog"] form, div.M9, div[aria-label="New Message"]';
const TOOLBAR_SELECTOR = 'tr.btC td.gU';
const BODY_SELECTOR = 'div[role="textbox"][aria-label="Message Body"]';
const SIGNATURE_SELECTOR = 'div[data-smartmail="gmail_signature"]';
const TO_FIELD_SELECTOR = 'input[name="to"]';
const SUBJECT_SELECTOR = 'input[name="subjectbox"]';

// Track which compose windows have already been enhanced
const processed = new WeakSet<Element>();

function getActiveSenderId(): Promise<string | null> {
  return new Promise(resolve => {
    chrome.storage.local.get('activeSenderId', result => {
      resolve(result.activeSenderId ?? null);
    });
  });
}

function injectStampButton(compose: Element) {
  if (processed.has(compose)) return;
  processed.add(compose);

  const toolbar = compose.querySelector(TOOLBAR_SELECTOR);
  if (!toolbar) return;

  // Guard against double injection when multiple selectors match the same toolbar
  if (toolbar.querySelector('.si-stamp-btn')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'si-stamp-btn';
  btn.title = 'Add signedinbox stamp';
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#5a9471"/>
    <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
    <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="#ffffff"/>
    <path d="M64 49 L64 113" stroke="#477857" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857"/>
    <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.style.opacity = '0.4';

    const reset = () => {
      btn.disabled = false;
      btn.style.opacity = '';
    };

    // Extension context becomes invalid after a reload — chrome APIs go undefined
    if (!chrome?.runtime?.id) {
      alert('signedinbox: Extension was reloaded — please refresh this Gmail tab.');
      reset();
      return;
    }

    try {
      const senderId = await getActiveSenderId();
      const subjectInput = compose.querySelector<HTMLInputElement>(SUBJECT_SELECTOR);

      // Collect all recipient chips across TO, CC, and BCC fields.
      // Gmail renders each chip with a span[email] attribute.
      const chips = Array.from(compose.querySelectorAll<HTMLElement>('span[email]'));
      const recipientEmails = chips.map(c => c.getAttribute('email')).filter(Boolean) as string[];

      // Fall back to the raw TO input value if no chips found (e.g. mid-typing)
      if (recipientEmails.length === 0) {
        const toInput = compose.querySelector<HTMLInputElement>(TO_FIELD_SELECTOR);
        if (toInput?.value) recipientEmails.push(toInput.value.trim());
      }

      const primaryRecipient = recipientEmails[0];
      const recipientCount = recipientEmails.length;

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_STAMP',
        senderId,
        recipientEmail: primaryRecipient,
        subjectHint: subjectInput?.value || undefined,
        recipientCount,
      });

      if (response.error) {
        alert(`signedinbox: ${response.error}`);
        reset();
        return;
      }

      injectBadge(compose, response.stamp.badge_html);
      btn.title = 'Stamped ✓';
      setTimeout(() => { reset(); btn.title = 'Add signedinbox stamp'; }, 3000);
    } catch (err) {
      alert(`signedinbox: ${err instanceof Error ? err.message : String(err)}`);
      reset();
    }
  });

  toolbar.appendChild(btn);
}

function injectBadge(compose: Element, badgeHtml: string) {
  const body = compose.querySelector<HTMLElement>(BODY_SELECTOR);
  if (!body) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = badgeHtml;
  const badge = wrapper.firstElementChild as HTMLElement;
  if (!badge) return;

  badge.style.display = 'inline-block';
  badge.style.margin = '8px 0';

  const signature = body.querySelector<HTMLElement>(SIGNATURE_SELECTOR);
  if (signature) {
    body.insertBefore(badge, signature);
  } else {
    body.appendChild(badge);
  }

  // Trigger Gmail draft save
  body.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

// ─── Mutation observer ────────────────────────────────────────────────────────

function handleMutations(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      const composes = node.matches(COMPOSE_SELECTOR)
        ? [node]
        : Array.from(node.querySelectorAll(COMPOSE_SELECTOR));
      for (const compose of composes) {
        // Toolbar might not be rendered yet — wait a tick
        setTimeout(() => injectStampButton(compose), 500);
      }
    }
  }
}

const observer = new MutationObserver(handleMutations);
observer.observe(document.body, { childList: true, subtree: true });

// Handle any compose windows already open on load
document.querySelectorAll(COMPOSE_SELECTOR).forEach(el => injectStampButton(el));
