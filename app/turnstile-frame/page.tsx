"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Prefer the extension-specific managed widget key; fall back to the main key
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY_EXTENSION || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Restrict postMessage to the specific extension origin when the ID is configured.
// Falls back to "*" in dev (no extension ID set). Set NEXT_PUBLIC_EXTENSION_ID in production.
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID;
const PARENT_ORIGIN = EXTENSION_ID ? `chrome-extension://${EXTENSION_ID}` : "*";

function postToParent(msg: object) {
  window.parent.postMessage(msg, PARENT_ORIGIN);
}

export default function TurnstileFramePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Dev mode: no site key configured — return a bypass token immediately
  useEffect(() => {
    if (!SITE_KEY) {
      postToParent({ type: "TURNSTILE_TOKEN", token: "dev-bypass" });
    }
  }, []);

  // Render widget once the Turnstile script is loaded
  useEffect(() => {
    if (!scriptReady || !SITE_KEY || !containerRef.current) return;

    const tw = (window as any).turnstile;
    if (!tw) return;

    tw.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => {
        postToParent({ type: "TURNSTILE_TOKEN", token });
      },
      "before-interactive-callback": () => {
        // Cloudflare needs a human checkbox — signal the extension immediately
        // so it can open a visible popup rather than waiting on a hidden challenge
        postToParent({ type: "TURNSTILE_NEEDS_INTERACTION" });
      },
      "error-callback": (err: unknown) => {
        postToParent({ type: "TURNSTILE_ERROR", error: String(err) });
      },
      "expired-callback": () => {
        postToParent({ type: "TURNSTILE_ERROR", error: "Token expired" });
      },
      appearance: "interaction-only",
      theme: "light",
    });

    // Re-render on request from the extension — validate origin before acting
    function handleMessage(e: MessageEvent) {
      if (EXTENSION_ID && e.origin !== `chrome-extension://${EXTENSION_ID}`) return;
      if (e.data?.type === "REQUEST_TOKEN") {
        (window as any).turnstile?.reset(containerRef.current);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [scriptReady]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
