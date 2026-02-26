"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 128 128" fill="none">
            <defs>
              <linearGradient id="suBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6b9e7e" />
                <stop offset="100%" stopColor="#2d5040" />
              </linearGradient>
              <linearGradient id="suNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="64" fill="url(#suBg)" />
            <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#suNib)" />
            <path d="M64 49 L64 113" stroke="#2d5040" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="64" cy="51" rx="10" ry="7" fill="#2d5040" />
            <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[16px] text-[#1a1917]">SignedInbox</span>
        </Link>
      </div>

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-1">Create account</h1>
        <p className="text-[14px] text-[#9a958e] mb-7">Free. No credit card needed.</p>

        <form onSubmit={handleSignup} className="space-y-4">
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
          <div>
            <label className="block text-[13px] font-medium text-[#3a3830] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-[#e5e2d8] focus:border-[#3d6b52] rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] outline-none transition-colors bg-white"
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
              className="w-full border border-[#e5e2d8] focus:border-[#3d6b52] rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] outline-none transition-colors bg-white"
            />
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3d6b52] hover:bg-[#2d5040] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors mt-1"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f0ede6] text-center text-[13px] text-[#9a958e]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#3d6b52] hover:text-[#2d5040] font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
