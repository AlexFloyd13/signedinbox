"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/supabase/authed-fetch";

type Step = "loading" | "done" | "error";

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
      <span className="font-bold text-[16px] text-[#1a1917]">signedinbox</span>
    </Link>
  );
}

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("loading");
  const [userEmail, setUserEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function claim() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email);

      // Check if already fully set up — skip onboarding
      try {
        const check = await authedFetch("/api/v1/stamps?action=senders");
        if (check.ok) {
          const { senders = [] } = await check.json();
          if (senders.some((s: { email: string; verified_email: boolean }) => s.email === user.email && s.verified_email)) {
            router.replace("/dashboard");
            return;
          }
        }
      } catch { /* ignore, proceed */ }

      // Auto-create and verify sender from auth email — no OTP needed
      try {
        const res = await authedFetch("/api/v1/stamps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim-auth-email" }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Setup failed");
        }
        setStep("done");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
        setStep("error");
      }
    }
    claim();
  }, [router]);

  async function retry() {
    setStep("loading");
    setErrorMsg("");
    const res = await authedFetch("/api/v1/stamps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim-auth-email" }),
    });
    if (res.ok) {
      setStep("done");
    } else {
      const d = await res.json();
      setErrorMsg(d.error || "Setup failed");
      setStep("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <Logo />
      </div>

      <div className="w-full max-w-sm bg-white border border-[#e5e2d8] rounded-2xl p-8 shadow-sm">

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#e5e2d8] border-t-[#3d6b52] animate-spin" />
            <p className="text-[14px] text-[#9a958e]">Setting up your account…</p>
          </div>
        )}

        {/* Done */}
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
                has been added as your first verified sender.
              </p>
            </div>

            <div className="bg-[#f5f4ef] rounded-xl px-4 py-4 text-left flex flex-col gap-2.5">
              <p className="text-[11px] font-semibold text-[#9a958e] uppercase tracking-wider">
                What&apos;s next
              </p>
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

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col gap-5 text-center">
            <div>
              <h1 className="font-serif text-xl font-bold text-[#1a1917] mb-2">
                Setup failed
              </h1>
              <p className="text-[13px] text-red-600">{errorMsg}</p>
            </div>
            <button
              onClick={retry}
              className="w-full bg-[#3d6b52] hover:bg-[#2d5040] text-white rounded-lg py-2.5 text-[14px] font-medium transition-colors"
            >
              Try again
            </button>
            <Link href="/dashboard" className="text-[13px] text-[#9a958e] hover:text-[#5a5750] transition-colors">
              Skip and go to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
