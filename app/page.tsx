import Link from "next/link";

export default function Home() {
  return (
    <div className="dot-grid min-h-screen flex flex-col text-[#ede9ff]">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 sm:px-10 h-16 border-b border-[rgba(129,140,248,0.08)]">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#4338ca" />
            <circle cx="14" cy="14" r="11.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
            <path d="M14 4.5L20.5 13L14 22L7.5 13Z" fill="rgba(255,255,255,0.95)" />
            <path d="M14 11L14 22" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="14" cy="11.5" rx="2.6" ry="1.9" fill="#3730a3" />
          </svg>
          <span className="text-[16px] tracking-tight">
            <span className="font-semibold text-[#ede9ff]">Signed</span>
            <span className="font-mono font-normal text-[#818cf8]">Inbox</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="text-[12px] font-mono text-[#4e4a65] hover:text-[#ede9ff] transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-[12px] font-mono bg-indigo-600/20 hover:bg-indigo-600/40 text-[#818cf8] border border-indigo-500/25 rounded-md px-3 py-1.5 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col lg:flex-row items-center max-w-6xl mx-auto w-full px-6 sm:px-10 pt-20 pb-24 gap-16">

        {/* Left — copy */}
        <div className="flex-1 flex flex-col gap-8 lg:max-w-[520px]">
          <div className="inline-flex items-center gap-2 self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#818cf8]/70">
              Open source · Ed25519 · Free
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight text-[#f0eeff]">
            Every email,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              signed.
            </span>
          </h1>

          <p className="text-[16px] text-[#6b6484] leading-relaxed max-w-md">
            Attach a cryptographic proof to every email you send. Anyone can verify
            it&apos;s genuinely from you — no account, no app, just a link.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[14px] font-medium px-5 py-2.5 rounded-lg transition-colors tracking-wide"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="text-[14px] text-[#4e4a65] hover:text-[#818cf8] transition-colors font-mono"
            >
              Sign in →
            </Link>
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Ed25519 signed", "Turnstile-attested", "Timestamp bound", "Self-hostable"].map(label => (
              <span
                key={label}
                className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#4e4a65] border border-[rgba(129,140,248,0.1)] rounded px-2.5 py-1"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right — product mockup */}
        <div className="flex-shrink-0 w-full lg:w-[400px]">
          {/* Fake email client */}
          <div className="bg-[#0b0b1e] border border-[rgba(129,140,248,0.14)] rounded-xl overflow-hidden shadow-2xl shadow-indigo-950/60">
            {/* Email chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[rgba(129,140,248,0.08)] bg-[#090918]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2a2742]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2a2742]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2a2742]" />
              <span className="ml-3 font-mono text-[10px] text-[#3a3655]">New Message</span>
            </div>

            {/* Header fields */}
            <div className="px-5 py-3 border-b border-[rgba(129,140,248,0.06)] space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[#3a3655] w-8">To</span>
                <span className="text-[12px] text-[#6b6484]">recruiter@company.com</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[#3a3655] w-8">Re</span>
                <span className="text-[12px] text-[#6b6484]">Senior Engineer role — Alex Floyd</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-2.5">
              <div className="h-2 bg-[rgba(129,140,248,0.05)] rounded-full w-full" />
              <div className="h-2 bg-[rgba(129,140,248,0.05)] rounded-full w-[85%]" />
              <div className="h-2 bg-[rgba(129,140,248,0.05)] rounded-full w-[70%]" />
              <div className="h-2 bg-[rgba(129,140,248,0.05)] rounded-full w-[90%]" />
              <div className="h-2 bg-[rgba(129,140,248,0.05)] rounded-full w-[55%]" />
            </div>

            {/* Stamp badge — the product */}
            <div className="mx-5 mb-5 rounded-lg border border-indigo-500/20 bg-indigo-950/30 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-700/60 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 2.5" stroke="#a5b4fc" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-indigo-100">Verified by SignedInbox</div>
                <div className="font-mono text-[10px] text-indigo-300/50 truncate">
                  Ed25519 · alex@floyd.dev · 26 Feb 2026
                </div>
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className="font-mono text-[9px] text-indigo-400/50 border border-indigo-500/15 rounded px-1.5 py-0.5 whitespace-nowrap">
                  verify →
                </span>
              </div>
            </div>
          </div>

          {/* Caption */}
          <p className="font-mono text-[10px] text-[#3a3655] text-center mt-3 tracking-wide">
            What recipients see when you stamp an email
          </p>
        </div>
      </main>

      {/* How it works */}
      <section className="border-t border-[rgba(129,140,248,0.08)] py-20 px-6 sm:px-10">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#818cf8]/50 text-center mb-12">
            How it works
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                n: "01",
                title: "Register a sender",
                body: "Add your email address and verify it with a one-time code. Your identity is tied to an Ed25519 key pair.",
              },
              {
                n: "02",
                title: "Stamp your email",
                body: "Pass a Cloudflare Turnstile CAPTCHA — proving you're human. A cryptographic stamp is generated and signed.",
              },
              {
                n: "03",
                title: "Recipient verifies",
                body: "They click the badge link. The server checks the signature, expiry, and revocation status in real time.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex flex-col gap-3">
                <span className="font-mono text-[11px] text-[#818cf8]/40 tracking-widest">{n}</span>
                <h3 className="text-[15px] font-semibold text-[#ede9ff]">{title}</h3>
                <p className="text-[13px] text-[#4e4a65] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[rgba(129,140,248,0.08)] py-20 px-6 text-center">
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#818cf8]/50 mb-4">
          Free · Open source · MIT licensed
        </p>
        <h2 className="text-3xl font-bold text-[#f0eeff] mb-8">
          Start signing today.
        </h2>
        <Link
          href="/signup"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-[14px] font-medium px-6 py-3 rounded-lg transition-colors tracking-wide"
        >
          Create free account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(129,140,248,0.06)] py-6 px-6 sm:px-10 flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#2e2b42] tracking-wide">
          © 2026 SignedInbox
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-mono text-[10px] text-[#3a3655] hover:text-[#818cf8] transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="font-mono text-[10px] text-[#3a3655] hover:text-[#818cf8] transition-colors">
            Sign up
          </Link>
        </div>
      </footer>

    </div>
  );
}
