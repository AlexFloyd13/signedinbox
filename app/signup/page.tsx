"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const Seal = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="14" fill="#4338ca" />
    <circle cx="14" cy="14" r="11.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
    <path d="M14 4.5L20.5 13L14 22L7.5 13Z" fill="rgba(255,255,255,0.95)" />
    <path d="M14 11L14 22" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="14" cy="11.5" rx="2.6" ry="1.9" fill="#3730a3" />
  </svg>
);

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
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
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
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
        <div className="mb-7">
          <h1 className="text-[18px] font-semibold text-[#ede9ff] leading-tight">Create account</h1>
          <p className="text-[13px] text-[#4e4a65] mt-1">Free. Open source. No tracking.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
          <div>
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[#818cf8]/60 mb-1.5">
              Password
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
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md py-2.5 text-[13px] font-medium tracking-wide transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[rgba(129,140,248,0.08)] text-center">
          <span className="text-[12px] text-[#4e4a65]">Already have an account? </span>
          <Link href="/login" className="text-[12px] text-[#818cf8] hover:text-white transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
