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
    <nav className="flex items-center justify-between px-6 h-14 border-b border-[rgba(129,140,248,0.08)]">
      <Link href="/dashboard" className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="#4338ca" />
          <circle cx="14" cy="14" r="11.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
          <path d="M14 4.5L20.5 13L14 22L7.5 13Z" fill="rgba(255,255,255,0.95)" />
          <path d="M14 11L14 22" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="14" cy="11.5" rx="2.6" ry="1.9" fill="#3730a3" />
        </svg>
        <span className="text-[15px] tracking-tight">
          <span className="font-semibold text-[#ede9ff]">Signed</span>
          <span className="font-mono font-normal text-[#818cf8]">Inbox</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="text-[12px] font-mono text-[#4e4a65] hover:text-[#ede9ff] transition-colors px-3 py-1.5 rounded"
        >
          Home
        </Link>
        <span className="text-[#2a2742] text-xs">·</span>
        <button
          onClick={handleSignOut}
          className="text-[12px] font-mono text-[#4e4a65] hover:text-[#ede9ff] transition-colors px-3 py-1.5 rounded"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
