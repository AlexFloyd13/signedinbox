"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardNav() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between px-6 h-14 border-b border-[#e5e2d8] bg-white">
      <Link href="/dashboard" className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 128 128" fill="none">
          <defs>
            <linearGradient id="navBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6b9e7e" />
              <stop offset="100%" stopColor="#477857" />
            </linearGradient>
            <linearGradient id="navNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" r="64" fill="url(#navBg)" />
          <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#navNib)" />
          <path d="M64 49 L64 113" stroke="#477857" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857" />
          <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
        <span className="font-bold text-[15px] text-[#1a1917]">SignedInbox</span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="text-[13px] text-[#9a958e] hover:text-[#1a1917] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#eae8e2]"
        >
          Home
        </Link>
        <button
          onClick={handleSignOut}
          className="text-[13px] text-[#9a958e] hover:text-[#1a1917] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#eae8e2]"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
