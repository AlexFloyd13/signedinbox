"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="64" fill="#3d6b52" />
            <circle cx="64" cy="64" r="55" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <path d="M64 18 L92 58 L64 96 L36 58 Z" fill="rgba(255,255,255,0.96)" />
            <path d="M64 46 L64 96" stroke="#2d5040" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="64" cy="48" rx="10" ry="7" fill="#2d5040" />
          </svg>
          <span className="font-bold text-[16px] text-[#1a1917]">SignedInbox</span>
        </Link>
      </div>

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">
        {submitted ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#f0f7f3] border border-[#b8d4c0] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4.5 4.5L16 5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-serif text-xl font-bold text-[#1a1917] mb-2">Check your inbox</h1>
            <p className="text-[14px] text-[#9a958e] leading-relaxed mb-6">
              If an account exists with that email, a reset link is on its way.
            </p>
            <Link
              href="/login"
              className="block w-full text-center bg-[#3d6b52] hover:bg-[#2d5040] text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-1">Reset password</h1>
            <p className="text-[14px] text-[#9a958e] mb-7">We&apos;ll email you a link to reset it.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3a3830] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-[#e5e2d8] focus:border-[#3d6b52] rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] placeholder:text-[#c5c0b8] outline-none transition-colors bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3d6b52] hover:bg-[#2d5040] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#f0ede6] text-center">
              <Link href="/login" className="text-[13px] text-[#3d6b52] hover:text-[#2d5040] transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
