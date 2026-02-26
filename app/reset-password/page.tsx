"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const Seal = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="14" fill="#4338ca" />
    <circle cx="14" cy="14" r="11.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
    <path d="M14 4.5L20.5 13L14 22L7.5 13Z" fill="rgba(255,255,255,0.95)" />
    <path d="M14 11L14 22" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="14" cy="11.5" rx="2.6" ry="1.9" fill="#3730a3" />
  </svg>
);

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });

    // Always show success to avoid email enumeration
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="dot-grid min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 mb-8">
        <Seal />
        <span className="text-[17px] tracking-tight">
          <span className="font-semibold text-[#ede9ff]">Signed</span>
          <span className="font-mono font-normal text-[#818cf8]">Inbox</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] bg-[#0b0b1e] border border-[rgba(129,140,248,0.13)] rounded-xl p-9">
        {submitted ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 mb-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 4.5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-[18px] font-semibold text-[#ede9ff] mb-2">Check your email</h1>
            <p className="text-[13px] text-[#4e4a65] leading-relaxed mb-7">
              If an account exists with that email, you&apos;ll receive a reset link shortly.
            </p>
            <Link
              href="/login"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-md py-2.5 text-[13px] font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-[18px] font-semibold text-[#ede9ff] leading-tight">Reset password</h1>
              <p className="text-[13px] text-[#4e4a65] mt-1">We&apos;ll send you a secure link.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[#818cf8]/60 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#080816] border border-[rgba(129,140,248,0.12)] focus:border-[#818cf8] rounded-md px-3.5 py-2.5 text-sm text-[#ede9ff] placeholder:text-[#3a3655] outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md py-2.5 text-[13px] font-medium tracking-wide transition-colors"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[rgba(129,140,248,0.08)] text-center">
              <Link href="/login" className="text-[12px] text-[#818cf8] hover:text-white transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
