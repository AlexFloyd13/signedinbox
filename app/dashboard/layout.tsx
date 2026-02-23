import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span>✍️</span>
          <span className="font-bold text-indigo-400">SignedInbox</span>
        </Link>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Home
        </Link>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
