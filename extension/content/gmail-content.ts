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

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'si-stamp-btn';
  btn.title = 'Add SignedInbox stamp';
  btn.textContent = '✍️ Stamp';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '⏳ Stamping...';

    try {
      const senderId = await getActiveSenderId();
      if (!senderId) {
        alert('SignedInbox: No sender selected. Open the extension popup to select one.');
        return;
      }

      const toInput = compose.querySelector<HTMLInputElement>(TO_FIELD_SELECTOR);
      const subjectInput = compose.querySelector<HTMLInputElement>(SUBJECT_SELECTOR);

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_STAMP',
        senderId,
        recipientEmail: toInput?.value || undefined,
        subjectHint: subjectInput?.value || undefined,
      });

      if (response.error) {
        alert(`SignedInbox error: ${response.error}`);
        return;
      }

      injectBadge(compose, response.stamp.badge_html);
      btn.textContent = '✅ Stamped';
      setTimeout(() => {
        btn.textContent = '✍️ Stamp';
        btn.disabled = false;
      }, 3000);
    } catch (err) {
      alert(`SignedInbox: ${err instanceof Error ? err.message : String(err)}`);
      btn.textContent = '✍️ Stamp';
      btn.disabled = false;
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
