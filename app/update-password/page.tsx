"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        {success ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 mb-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 4.5" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-[18px] font-semibold text-[#ede9ff] mb-2">Password updated</h1>
            <p className="text-[13px] text-[#4e4a65]">Redirecting to your dashboard…</p>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-[18px] font-semibold text-[#ede9ff] leading-tight">New password</h1>
              <p className="text-[13px] text-[#4e4a65] mt-1">Choose something strong.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[#818cf8]/60 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#080816] border border-[rgba(129,140,248,0.12)] focus:border-[#818cf8] rounded-md px-3.5 py-2.5 text-sm text-[#ede9ff] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[#818cf8]/60 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#080816] border border-[rgba(129,140,248,0.12)] focus:border-[#818cf8] rounded-md px-3.5 py-2.5 text-sm text-[#ede9ff] outline-none transition-colors"
                />
              </div>

              {error && (
                <p className="text-[12px] text-red-400/90 font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md py-2.5 text-[13px] font-medium tracking-wide transition-colors"
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
