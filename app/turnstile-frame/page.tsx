"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function TurnstileFramePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Dev mode: no site key configured — return a bypass token immediately
  useEffect(() => {
    if (!SITE_KEY) {
      window.parent.postMessage({ type: "TURNSTILE_TOKEN", token: "dev-bypass" }, "*");
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
        window.parent.postMessage({ type: "TURNSTILE_TOKEN", token }, "*");
      },
      "error-callback": (err: unknown) => {
        window.parent.postMessage({ type: "TURNSTILE_ERROR", error: String(err) }, "*");
      },
      "expired-callback": () => {
        window.parent.postMessage({ type: "TURNSTILE_ERROR", error: "Token expired" }, "*");
      },
      appearance: "interaction-only",
      theme: "light",
    });

    // Re-render on request from the extension
    function handleMessage(e: MessageEvent) {
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
