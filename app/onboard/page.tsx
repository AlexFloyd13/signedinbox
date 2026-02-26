"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/supabase/authed-fetch";

type Step = "loading" | "welcome" | "verify" | "done";

interface Sender {
  id: string;
  email: string;
  verified_email: boolean;
}

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 128 128" fill="none">
        <defs>
          <linearGradient id="obBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6b9e7e" />
            <stop offset="100%" stopColor="#2d5040" />
          </linearGradient>
          <linearGradient id="obNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r="64" fill="url(#obBg)" />
        <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#obNib)" />
        <path d="M64 49 L64 113" stroke="#2d5040" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="64" cy="51" rx="10" ry="7" fill="#2d5040" />
        <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <span className="font-bold text-[16px] text-[#1a1917]">SignedInbox</span>
    </Link>
  );
}

function StepDots({ current }: { current: Step }) {
  const steps: Step[] = ["welcome", "verify", "done"];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              i <= idx ? "bg-[#3d6b52]" : "bg-[#d5d0c8]"
            }`}
          />
          {i < steps.length - 1 && (
            <div className={`w-8 h-px transition-colors ${i < idx ? "bg-[#3d6b52]" : "bg-[#d5d0c8]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("loading");
  const [userEmail, setUserEmail] = useState("");
  const [senderId, setSenderId] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const initOnboard = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      router.replace("/login");
      return;
    }
    setUserEmail(user.email);

    // Check if user already has a sender for their auth email
    try {
      const res = await authedFetch("/api/v1/stamps?action=senders");
      if (res.ok) {
        const data = await res.json();
        const senders: Sender[] = data.senders ?? [];
        const match = senders.find((s) => s.email === user.email);
        if (match) {
          setSenderId(match.id);
          if (match.verified_email) {
            router.replace("/dashboard");
            return;
          }
          // Already created but not yet verified — go straight to verify
          setStep("verify");
          return;
        }
      }
    } catch {
      // ignore, proceed to welcome
    }

    setStep("welcome");
  }, [router]);

  useEffect(() => {
    initOnboard();
  }, [initOnboard]);

  async function handleGetStarted() {
    setStarting(true);
    setError(null);
    try {
      // Derive a readable display name from the email prefix
      const prefix = userEmail.split("@")[0];
      const displayName = prefix
        .replace(/[._\-+]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() || userEmail;

      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-sender",
          display_name: displayName,
          email: userEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set up sender");
      const sid = data.sender.id;
      setSenderId(sid);

      // Send the verification code
      const vres = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-verification", sender_id: sid }),
      });
      if (!vres.ok) {
        const vd = await vres.json();
        throw new Error(vd.error || "Failed to send verification code");
      }

      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleResendCode() {
    if (!senderId) return;
    setError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-verification", sender_id: senderId }),
      });
      if (!res.ok) throw new Error("Failed to resend code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend");
    }
  }

  async function handleVerify() {
    if (codeInput.length !== 6 || !senderId) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-email",
          sender_id: senderId,
          code: codeInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#f5f4ef] flex items-center justify-center">
        <span className="text-[#9a958e] text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Logo />
      </div>

      <StepDots current={step} />

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">

        {/* ── Step 1: Welcome ────────────────────────────────────── */}
        {step === "welcome" && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#eef5f1] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d6b52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m2 7 10 7 10-7" />
                </svg>
              </div>
              <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-2">
                Welcome to SignedInbox
              </h1>
              <p className="text-[14px] text-[#9a958e]">
                Let&apos;s verify your email so you can start stamping.
              </p>
            </div>

            <div className="bg-[#f5f4ef] rounded-xl px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-wider text-[#b5b0a8] mb-1 font-medium">
                Your sender email
              </p>
              <p className="text-[14px] font-medium text-[#1a1917] break-all">{userEmail}</p>
            </div>

            {error && (
              <p className="text-[13px] text-red-600">{error}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGetStarted}
                disabled={starting}
                className="w-full bg-[#3d6b52] hover:bg-[#2d5040] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors"
              >
                {starting ? "Setting up…" : "Get started"}
              </button>
              <p className="text-[12px] text-[#b5b0a8] text-center">
                We&apos;ll send a 6-digit code to confirm you own this address.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Verify OTP ─────────────────────────────────── */}
        {step === "verify" && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-2">
                Check your inbox
              </h1>
              <p className="text-[14px] text-[#9a958e]">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-[#3a3830]">{userEmail}</span>
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#3a3830] mb-2">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={codeInput}
                onChange={(e) =>
                  setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoFocus
                className="w-full border border-[#e5e2d8] focus:border-[#3d6b52] rounded-lg px-3.5 py-3 text-[22px] text-[#1a1917] text-center font-mono tracking-[0.4em] placeholder:tracking-normal placeholder:text-[#c5c0b8] outline-none transition-colors bg-white"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-600">{error}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleVerify}
                disabled={codeInput.length !== 6 || verifying}
                className="w-full bg-[#3d6b52] hover:bg-[#2d5040] disabled:opacity-50 text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors"
              >
                {verifying ? "Verifying…" : "Verify email"}
              </button>
              <p className="text-[13px] text-[#9a958e] text-center">
                Didn&apos;t get it?{" "}
                <button
                  onClick={handleResendCode}
                  className="text-[#3d6b52] hover:text-[#2d5040] font-medium transition-colors"
                >
                  Resend code
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ───────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex flex-col gap-6 text-center">
            <div>
              <div className="w-14 h-14 rounded-full bg-[#eef5f1] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d6b52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h1 className="font-serif text-2xl font-bold text-[#1a1917] mb-2">
                You&apos;re all set!
              </h1>
              <p className="text-[14px] text-[#9a958e]">
                <span className="font-medium text-[#3a3830]">{userEmail}</span>
                <br />
                is now a verified sender.
              </p>
            </div>

            <div className="bg-[#f5f4ef] rounded-xl px-4 py-4 text-left flex flex-col gap-2.5">
              <p className="text-[12px] font-semibold text-[#3a3830] uppercase tracking-wider">What&apos;s next</p>
              {[
                "Generate a stamp before sending an email",
                "Paste the badge into your email signature or body",
                "Recipients can verify it's really you",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#3d6b52]/10 text-[#3d6b52] text-[11px] font-bold flex items-center justify-center shrink-0 mt-px">
                    {i + 1}
                  </div>
                  <p className="text-[13px] text-[#5a5750]">{tip}</p>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard"
              className="w-full bg-[#3d6b52] hover:bg-[#2d5040] text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors text-center block"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Skip link for users who want to go directly to dashboard */}
      {step !== "done" && (
        <p className="mt-6 text-[12px] text-[#b5b0a8]">
          <Link href="/dashboard" className="hover:text-[#9a958e] transition-colors">
            Skip for now
          </Link>
        </p>
      )}
    </div>
  );
}
