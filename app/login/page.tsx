"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
          <svg width="28" height="28" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="64" fill="#15803d" />
            <circle cx="64" cy="64" r="55" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <path d="M64 18 L92 58 L64 96 L36 58 Z" fill="rgba(255,255,255,0.96)" />
            <path d="M64 46 L64 96" stroke="#14532d" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="64" cy="48" rx="10" ry="7" fill="#14532d" />
          </svg>
          <span className="font-bold text-[16px] text-[#1a1917]">SignedInbox</span>
        </Link>
      </div>

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-1">Sign in</h1>
        <p className="text-[14px] text-[#9a958e] mb-7">Welcome back.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#3a3830] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-[#e5e2d8] focus:border-green-600 rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] placeholder:text-[#c5c0b8] outline-none transition-colors bg-white"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] font-medium text-[#3a3830]">Password</label>
              <Link href="/reset-password" className="text-[12px] text-green-700 hover:text-green-800 transition-colors">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-[#e5e2d8] focus:border-green-600 rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] outline-none transition-colors bg-white"
            />
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#15803d] hover:bg-[#14532d] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors mt-1"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f0ede6] text-center text-[13px] text-[#9a958e]">
          No account?{" "}
          <Link href="/signup" className="text-green-700 hover:text-green-800 font-medium transition-colors">
            Create one free
          </Link>
        </div>
      </div>
    </div>
  );
}
