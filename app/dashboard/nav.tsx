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
    <nav className="flex items-center justify-between px-6 h-14 border-b border-white/8 bg-[#0f0f14]">
      <Link href="/dashboard" className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 128 128" fill="none">
          <circle cx="64" cy="64" r="64" fill="#4338ca" />
          <circle cx="64" cy="64" r="55" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <path d="M64 18 L92 58 L64 96 L36 58 Z" fill="rgba(255,255,255,0.96)" />
          <path d="M64 46 L64 96" stroke="#3730a3" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="64" cy="48" rx="10" ry="7" fill="#3730a3" />
        </svg>
        <span className="font-bold text-[15px] text-white">SignedInbox</span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="text-[13px] text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Home
        </Link>
        <button
          onClick={handleSignOut}
          className="text-[13px] text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
