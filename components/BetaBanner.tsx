"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "beta_banner_dismissed";

export default function BetaBanner() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "dupe">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setStatus("done");
        setTimeout(dismiss, 3000);
      } else if (res.status === 409) {
        setStatus("dupe");
      } else {
        const d = await res.json();
        setErrorMsg(d.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Something went wrong");
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div className="bg-[#1a1917] text-white px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
        <span className="text-xs font-medium text-[#b8d4c0] shrink-0">Chrome extension beta</span>
        <span className="text-xs text-[#9a958e] hidden sm:inline">—</span>
        {status === "done" ? (
          <span className="text-xs text-[#5a9471]">You&apos;re on the list. We&apos;ll be in touch.</span>
        ) : status === "dupe" ? (
          <span className="text-xs text-[#9a958e]">You&apos;re already on the list.</span>
        ) : (
          <>
            <span className="text-xs text-[#9a958e] hidden sm:inline">Sign up for early access.</span>
            <form onSubmit={submit} className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 min-w-0 bg-[#2a2926] border border-[#3a3830] rounded-lg px-3 py-1 text-xs text-white placeholder:text-[#6b6560] focus:outline-none focus:border-[#5a9471] transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="text-xs px-3 py-1 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-50 shrink-0"
              >
                {status === "loading" ? "…" : "Notify me"}
              </button>
            </form>
            {status === "error" && <span className="text-xs text-red-400">{errorMsg}</span>}
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-[#6b6560] hover:text-[#9a958e] transition-colors shrink-0 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
