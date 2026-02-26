"use client";

import { useState } from "react";

export default function RecipientVerify({ recipientEmailHash }: { recipientEmailHash: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);
  const [checking, setChecking] = useState(false);

  async function verify() {
    setChecking(true);
    setResult(null);
    const encoded = new TextEncoder().encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const computed = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setResult(computed === recipientEmailHash ? "match" : "mismatch");
    setChecking(false);
  }

  return (
    <div className="bg-white border border-[#e5e2d8] rounded-xl overflow-hidden">
      <button
        onClick={() => { setOpen(!open); setResult(null); setEmail(""); }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#faf9f7] transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-[#1a1917]">Verify you&apos;re the intended recipient</p>
          <p className="text-xs text-[#9a958e] mt-0.5">The sender specified a recipient — confirm this email was meant for you</p>
        </div>
        <span className={`text-[#9a958e] transition-transform text-xs ml-4 shrink-0 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-[#e5e2d8] px-5 py-4 flex flex-col gap-3">
          <p className="text-xs text-[#9a958e]">
            Enter your email address to confirm this stamp was intended for you. Your email is never sent — the check happens entirely in your browser.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9a958e]">Your email address</label>
            <input
              type="email"
              className="bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471] focus:bg-white transition-colors"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setResult(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) verify(); }}
            />
          </div>

          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
              result === "match"
                ? "bg-[#f0f7f3] border border-[#b8d4c0] text-[#5a9471]"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}>
              {result === "match"
                ? "✓ This email was intended for you."
                : "✗ This email was not addressed to you — it may have been forwarded or reused."}
            </div>
          )}

          <button
            onClick={verify}
            disabled={!email.trim() || checking}
            className="self-start text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
          >
            {checking ? "Checking…" : "Check"}
          </button>
        </div>
      )}
    </div>
  );
}
