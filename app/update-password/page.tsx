"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message.includes("expired") || error.message.includes("invalid")
        ? "This reset link has expired or is invalid. Please request a new one."
        : error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 128 128" fill="none">
            <defs>
              <linearGradient id="upBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6b9e7e" />
                <stop offset="100%" stopColor="#477857" />
              </linearGradient>
              <linearGradient id="upNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="64" fill="url(#upBg)" />
            <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#upNib)" />
            <path d="M64 49 L64 113" stroke="#477857" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857" />
            <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[16px] text-[#1a1917]">SignedInbox</span>
        </Link>
      </div>

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">
        {success ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#f0f7f3] border border-[#b8d4c0] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4.5 4.5L16 5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-serif text-xl font-bold text-[#1a1917] mb-2">Password updated</h1>
            <p className="text-[14px] text-[#9a958e]">Heading to your dashboard…</p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-1">New password</h1>
            <p className="text-[14px] text-[#9a958e] mb-7">Choose something you&apos;ll remember.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3a3830] mb-1.5">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-[#e5e2d8] focus:border-[#5a9471] rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] outline-none transition-colors bg-white"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#3a3830] mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-[#e5e2d8] focus:border-[#5a9471] rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] outline-none transition-colors bg-white"
                />
              </div>

              {error && <p className="text-[13px] text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5a9471] hover:bg-[#477857] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
