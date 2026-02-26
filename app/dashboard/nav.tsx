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
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span>✍️</span>
        <span className="font-bold text-indigo-400">SignedInbox</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Home
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
