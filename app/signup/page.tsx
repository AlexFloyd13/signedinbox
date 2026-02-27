"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

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
      router.push("/onboard");
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
                <stop offset="100%" stopColor="#477857" />
              </linearGradient>
              <linearGradient id="suNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="64" fill="url(#suBg)" />
            <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#suNib)" />
            <path d="M64 49 L64 113" stroke="#477857" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857" />
            <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[16px] text-[#1a1917]">signedinbox</span>
        </Link>
      </div>

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-1">Create account</h1>
        <p className="text-[14px] text-[#9a958e] mb-6">Free. No credit card needed.</p>

        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 border border-[#e5e2d8] rounded-lg py-2.5 text-[14px] font-medium text-[#1a1917] bg-white hover:bg-[#f5f4ef] hover:border-[#c5c0b8] disabled:opacity-50 transition-colors mb-4"
        >
          {GOOGLE_SVG}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#e5e2d8]" />
          <span className="text-[12px] text-[#c5c0b8]">or</span>
          <div className="flex-1 h-px bg-[#e5e2d8]" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#3a3830] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-[#e5e2d8] focus:border-[#5a9471] rounded-lg px-3.5 py-2.5 text-[14px] text-[#1a1917] placeholder:text-[#c5c0b8] outline-none transition-colors bg-white"
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
            disabled={loading || googleLoading}
            className="w-full bg-[#5a9471] hover:bg-[#477857] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors mt-1"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f0ede6] text-center text-[13px] text-[#9a958e]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#5a9471] hover:text-[#477857] font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
