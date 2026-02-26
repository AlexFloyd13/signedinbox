"use client";

import { useState } from "react";

export default function FurtherVerify({ contentHash }: { contentHash: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);
  const [checking, setChecking] = useState(false);

  async function verify() {
    setChecking(true);
    setResult(null);
    const input = `${email.toLowerCase()}|${subject}|${body.trim()}`;
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const computed = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setResult(computed === contentHash ? "match" : "mismatch");
    setChecking(false);
  }

  return (
    <div className="bg-white border border-[#e5e2d8] rounded-xl overflow-hidden">
      <button
        onClick={() => { setOpen(!open); setResult(null); }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#faf9f7] transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-[#1a1917]">Verify email content</p>
          <p className="text-xs text-[#9a958e] mt-0.5">Confirm this stamp matches the exact email you received</p>
        </div>
        <span className={`text-[#9a958e] transition-transform text-xs ml-4 shrink-0 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-[#e5e2d8] px-5 py-4 flex flex-col gap-3">
          <p className="text-xs text-[#9a958e]">
            The sender cryptographically bound this stamp to specific email content. Enter the exact details from the email you received to confirm nothing was altered.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9a958e]">Recipient email (yours)</label>
            <input
              className="bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471] focus:bg-white transition-colors"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setResult(null); }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9a958e]">Subject line</label>
            <input
              className="bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471] focus:bg-white transition-colors"
              placeholder="Exact subject line of the email"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setResult(null); }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9a958e]">Email body</label>
            <textarea
              className="bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471] focus:bg-white transition-colors min-h-[100px] resize-y"
              placeholder="Paste the full body text of the email…"
              value={body}
              onChange={(e) => { setBody(e.target.value); setResult(null); }}
            />
          </div>

          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
              result === "match"
                ? "bg-[#f0f7f3] border border-[#b8d4c0] text-[#5a9471]"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}>
              {result === "match"
                ? "✓ Content matches — this email is exactly as the sender intended."
                : "✗ Content does not match — the email may have been altered, or the details entered don't match exactly."}
            </div>
          )}

          <button
            onClick={verify}
            disabled={!email.trim() || !body.trim() || checking}
            className="self-start text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
          >
            {checking ? "Checking…" : "Verify content"}
          </button>
        </div>
      )}
    </div>
  );
}
