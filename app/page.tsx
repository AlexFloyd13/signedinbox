import Link from "next/link";

const SealIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <defs>
      <linearGradient id="sealBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6b9e7e" />
        <stop offset="100%" stopColor="#477857" />
      </linearGradient>
      <linearGradient id="sealNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="64" fill="url(#sealBg)" />
    <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
    <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#sealNib)" />
    <path d="M64 49 L64 113" stroke="#477857" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857" />
    <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#1a1917] flex flex-col">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 sm:px-10 h-16 border-b border-[#e5e2d8]">
        <div className="flex items-center gap-2.5">
          <SealIcon size={26} />
          <span className="font-bold text-[15px] tracking-tight text-[#1a1917]">signedinbox</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/privacy"
            className="text-[14px] text-[#6b6560] hover:text-[#1a1917] transition-colors px-4 py-2 rounded-lg hover:bg-[#eae8e2] hidden sm:block"
          >
            Privacy
          </Link>
          <Link
            href="/login"
            className="text-[14px] text-[#6b6560] hover:text-[#1a1917] transition-colors px-4 py-2 rounded-lg hover:bg-[#eae8e2] hidden sm:block"
          >
            Sign in
          </Link>
          <Link
            href="https://chromewebstore.google.com/detail/signedinbox"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium bg-[#5a9471] text-white px-4 py-2 rounded-lg hover:bg-[#477857] transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5A2.5 2.5 0 0 0 10.5 1h0A2.5 2.5 0 0 0 8 3.5V5H4a2 2 0 0 0-2 2v3.8h1.5A2.7 2.7 0 0 1 6.2 13.5h0A2.7 2.7 0 0 1 3.5 16.2H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 2.7-2.7h0a2.7 2.7 0 0 1 2.7 2.7V22H17a2 2 0 0 0 2-2v-4h1.5A2.5 2.5 0 0 0 23 13.5h0a2.5 2.5 0 0 0-2.5-2.5z" />
            </svg>
            Get Extension
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center text-center px-6 pt-20 pb-24">

        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-[#1a1917] leading-[1.08] tracking-tight max-w-2xl mb-6">
          Prove it&apos;s really you.
        </h1>

        <p className="text-[17px] text-[#6b6560] max-w-md leading-relaxed mb-10">
          Attach a verified stamp to any email you send.
          Anyone can check it&apos;s authentic — no app or account needed.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
          <Link
            href="/signup"
            className="bg-[#5a9471] hover:bg-[#477857] text-white text-[15px] font-medium px-6 py-3 rounded-xl transition-colors w-full sm:w-auto text-center"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="text-[15px] text-[#6b6560] hover:text-[#1a1917] transition-colors"
          >
            Already have an account? Sign in →
          </Link>
        </div>

        {/* Product mockup */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#e5e2d8] shadow-sm overflow-hidden text-left">
            {/* Email chrome bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-[#faf9f6] border-b border-[#e5e2d8]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              <span className="ml-3 text-[11px] text-[#b5b0a6]">New Message — Gmail</span>
            </div>
            {/* To / Subject */}
            <div className="px-5 py-3 border-b border-[#f0ede6] space-y-1.5">
              <div className="flex gap-3 text-[13px]">
                <span className="text-[#b5b0a6] w-8 shrink-0">To</span>
                <span className="text-[#6b6560]">hiring@company.com</span>
              </div>
              <div className="flex gap-3 text-[13px]">
                <span className="text-[#b5b0a6] w-8 shrink-0">Re</span>
                <span className="text-[#6b6560]">Following up — Alex Floyd</span>
              </div>
            </div>
            {/* Body placeholder lines */}
            <div className="px-5 py-4 space-y-2.5">
              <div className="h-2 bg-[#f0ede6] rounded-full w-full" />
              <div className="h-2 bg-[#f0ede6] rounded-full w-[82%]" />
              <div className="h-2 bg-[#f0ede6] rounded-full w-[68%]" />
            </div>
            {/* The stamp badge */}
            <div className="mx-5 mb-5 rounded-xl border border-[#b8d4c0] bg-[#f0f7f3] p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5a9471] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#1e4533]">Verified by signedinbox</div>
                <div className="text-[11px] text-[#5a9471] truncate">alex@floyd.dev · Stamp valid until Mar 28</div>
              </div>
              <span className="text-[11px] text-[#4d7c63] shrink-0 border border-[#b8d4c0] rounded-md px-2 py-0.5 ml-auto">
                Verify →
              </span>
            </div>
          </div>
          <p className="text-[12px] text-[#b5b0a6] text-center mt-3">
            What your recipient sees when you stamp an email
          </p>
        </div>
      </main>

      {/* Why it matters */}
      <section className="border-t border-[#e5e2d8] bg-[#faf9f6] py-20 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-[#1a1917] text-center mb-14">
            Why it matters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { stat: "98%", headline: "of emails are ignored", detail: "Average click-through rate is just 2%" },
              { stat: "79%", headline: "delete marketing emails", detail: "Trust is at an all-time low" },
              { stat: "41%", headline: "higher click-through", detail: "Verified, personalized emails earn more engagement" },
              { stat: "53%", headline: "lose trust from spam", detail: "Over half lose trust when emails look suspicious" },
            ].map(({ stat, headline, detail }) => (
              <div
                key={stat}
                className="bg-white rounded-xl border border-[#e5e2d8] p-6"
              >
                <div className="font-serif text-3xl font-bold text-[#5a9471] mb-1">{stat}</div>
                <div className="text-[15px] font-semibold text-[#1a1917] mb-1">{headline}</div>
                <div className="text-[13px] text-[#6b6560] leading-relaxed">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#e5e2d8] bg-white py-20 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-[#1a1917] text-center mb-14">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                n: "1",
                title: "Sign in with Google",
                body: "Connect your Gmail account in one click. Your email address is automatically verified — no confirmation code needed.",
              },
              {
                n: "2",
                title: "Stamp before you send",
                body: "Click once in Gmail. We run a quick human check to keep stamps trustworthy, then generate your badge.",
              },
              {
                n: "3",
                title: "They click to confirm",
                body: "Your recipient sees a badge in the email and can verify it's genuinely from you — right in their browser.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex flex-col gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5a9471] text-white text-[14px] font-bold flex items-center justify-center">
                  {n}
                </div>
                <h3 className="font-semibold text-[16px] text-[#1a1917]">{title}</h3>
                <p className="text-[14px] text-[#6b6560] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest disclaimer */}
      <section className="border-t border-[#e5e2d8] bg-[#faf9f6] py-14 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto text-center flex flex-col gap-4">
          <p className="text-[13px] text-[#9a958e] leading-relaxed">
            <span className="font-semibold text-[#6b6560]">A note on what this is (and isn&apos;t).</span>{" "}
            signedinbox makes it meaningfully harder for bots and impersonators to fake your identity,
            and adds a genuine signal of care and sincerity to your emails. It is not an absolute
            guarantee — determined attackers have workarounds for most verification systems. Think of it
            like a wax seal on an envelope: it doesn&apos;t make the letter invulnerable, but breaking it
            is obvious, and that matters.
          </p>
          <p className="text-[13px] text-[#9a958e] leading-relaxed">
            <span className="font-semibold text-[#6b6560]">Your email content stays on your device.</span>{" "}
            We never see recipient addresses, subject lines, or email body text. Everything is hashed
            locally in your browser before anything reaches our servers.{" "}
            <Link href="/privacy" className="text-[#5a9471] hover:underline">Read our full privacy policy →</Link>
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 text-center border-t border-[#e5e2d8]">
        <h2 className="font-serif text-4xl font-bold text-[#1a1917] mb-4">
          Ready to start?
        </h2>
        <p className="text-[15px] text-[#6b6560] mb-8">Takes two minutes to set up.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="bg-[#5a9471] hover:bg-[#477857] text-white text-[15px] font-medium px-7 py-3 rounded-xl transition-colors"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="text-[15px] text-[#6b6560] hover:text-[#1a1917] transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e2d8] py-6 px-6 sm:px-10 flex items-center justify-between">
        <span className="text-[12px] text-[#b5b0a6]">© 2026 signedinbox · MIT licensed</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-[12px] text-[#b5b0a6] hover:text-[#1a1917] transition-colors">Privacy</Link>
          <Link href="/login" className="text-[12px] text-[#b5b0a6] hover:text-[#1a1917] transition-colors">Sign in</Link>
          <Link href="/signup" className="text-[12px] text-[#b5b0a6] hover:text-[#1a1917] transition-colors">Sign up</Link>
        </div>
      </footer>

    </div>
  );
}
