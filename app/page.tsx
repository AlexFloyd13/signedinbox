"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.from("beta_waitlist").insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        // Already on waitlist — treat as success
        setStatus("done");
      } else {
        setErrorMsg("Something went wrong. Try again.");
        setStatus("error");
      }
    } else {
      setStatus("done");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-md flex flex-col items-center text-center gap-8">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20">
              ✍️
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Signed<span className="text-indigo-400">Inbox</span>
            </h1>
          </div>

          {/* Pitch */}
          <div className="flex flex-col gap-3">
            <p className="text-xl font-medium text-white/90 leading-snug">
              Cryptographic proof your email<br />came from a real human.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Stamp your emails with an Ed25519 digital signature before you send.
              Recipients verify it with one click — no accounts, no apps required.
            </p>
          </div>

          {/* Features */}
          <div className="w-full grid grid-cols-3 gap-3 text-xs text-zinc-400">
            {[
              { icon: "🔐", label: "Ed25519 signed" },
              { icon: "⚡", label: "One-click verify" },
              { icon: "🕐", label: "Timestamp bound" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/8 rounded-xl py-3 px-2">
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Waitlist form */}
          <div className="w-full flex flex-col gap-3">
            {status === "done" ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-4 flex flex-col items-center gap-1">
                <span className="text-indigo-400 font-semibold">You&apos;re on the list.</span>
                <span className="text-xs text-zinc-500">We&apos;ll reach out when SignedInbox opens to the public.</span>
              </div>
            ) : (
              <form onSubmit={joinWaitlist} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {status === "loading" ? "…" : "Join waitlist"}
                </button>
              </form>
            )}
            {status === "error" && (
              <p className="text-xs text-red-400 text-center">{errorMsg}</p>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-center pb-8">
        <Link href="/login" className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
          Sign in
        </Link>
      </footer>
    </div>
  );
}
