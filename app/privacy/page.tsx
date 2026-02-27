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

export const metadata = {
  title: "Privacy & About — signedinbox",
  description: "What signedinbox sees, what it doesn't, and how your email data stays on your device.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#1a1917] flex flex-col">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 sm:px-10 h-16 border-b border-[#e5e2d8] bg-white">
        <Link href="/" className="flex items-center gap-2.5">
          <SealIcon size={26} />
          <span className="font-bold text-[15px] tracking-tight text-[#1a1917]">signedinbox</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-[14px] text-[#6b6560] hover:text-[#1a1917] transition-colors px-4 py-2 rounded-lg hover:bg-[#eae8e2] hidden sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-[14px] font-medium bg-[#5a9471] text-white px-4 py-2 rounded-lg hover:bg-[#477857] transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 sm:px-10 py-14 max-w-2xl mx-auto w-full flex flex-col gap-10">

        {/* Page header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl font-bold text-[#1a1917] leading-tight">Privacy & About</h1>
          <p className="text-[15px] text-[#6b6560] leading-relaxed">
            What signedinbox sees, what it doesn&apos;t, and why we built it this way.
          </p>
        </div>

        {/* About */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-[#b5b0a6] uppercase tracking-wider">About</h2>
          <div className="bg-white border border-[#e5e2d8] rounded-xl p-6 flex flex-col gap-3">
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              signedinbox is a small tool that lets people prove a real human sent an email — not a bot, not a spoofed address, not an AI bulk sender. When you stamp an email, a cryptographic badge is embedded that anyone can verify in a browser. No app required, no account needed to verify.
            </p>
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              The code is MIT licensed and <a href="https://github.com/AlexFloyd13/signedinbox" target="_blank" rel="noopener noreferrer" className="text-[#5a9471] hover:underline">open source</a>.
            </p>
          </div>
        </section>

        {/* What we don't see */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-[#b5b0a6] uppercase tracking-wider">What we never see</h2>
          <div className="bg-white border border-[#e5e2d8] rounded-xl overflow-hidden">
            {[
              {
                icon: "✉️",
                title: "Your email body",
                detail: "The content of your email is never captured, transmitted, or stored. The Chrome extension reads the compose window only to inject the stamp badge — it does not send any body text to our servers.",
              },
              {
                icon: "👤",
                title: "Recipient email addresses",
                detail: "When you stamp an email, the recipient's address is hashed with SHA-256 on your device before anything leaves your browser. We store only an irreversible hash — not the address itself. We cannot read, reverse, or recover it.",
              },
              {
                icon: "📋",
                title: "Subject lines",
                detail: "Same as recipients — the subject line is included in the hash computed locally on your device. The plaintext subject is never sent to our API.",
              },
              {
                icon: "📎",
                title: "Attachments or metadata",
                detail: "We never access attachments, headers, thread history, or any other part of your Gmail account. The extension only interacts with the active compose window.",
              },
            ].map(({ title, detail }, i, arr) => (
              <div key={title} className={`p-5 ${i < arr.length - 1 ? "border-b border-[#f0ede6]" : ""}`}>
                <p className="text-[14px] font-semibold text-[#1a1917] mb-1">{title}</p>
                <p className="text-[13px] text-[#6b6560] leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How the hashing works */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-[#b5b0a6] uppercase tracking-wider">How client-side hashing works</h2>
          <div className="bg-white border border-[#e5e2d8] rounded-xl p-6 flex flex-col gap-3">
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              When the Chrome extension stamps an email, it computes a SHA-256 fingerprint of the sender, recipient, and subject — entirely inside your browser using the Web Crypto API. Only that fingerprint (a 64-character hex string) is sent to our servers.
            </p>
            <div className="bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-4 py-3 font-mono text-[12px] text-[#6b6560]">
              SHA-256(senderId | recipient@example.com | Subject line)
              <br />
              <span className="text-[#b5b0a6]">→ 3f7a9c2e1b4d8f6a… (stored, unreadable)</span>
            </div>
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              This hash is embedded in the stamp so recipients can verify the email wasn&apos;t tampered with — without us ever knowing who they are or what the subject said.
            </p>
          </div>
        </section>

        {/* What we do store */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-[#b5b0a6] uppercase tracking-wider">What we do store</h2>
          <div className="bg-white border border-[#e5e2d8] rounded-xl overflow-hidden">
            {[
              {
                title: "Your account email",
                detail: "Used for authentication only. Displayed publicly as a masked version (e.g. a***@gmail.com) on verification pages.",
              },
              {
                title: "Your display name",
                detail: "Shown on the stamp verification page so recipients know who sent the email. You set this when you create your account.",
              },
              {
                title: "Stamp metadata",
                detail: "Stamp ID, creation date, expiry date, and the content hash described above. This is the minimum needed to let recipients verify stamps.",
              },
              {
                title: "Verification count",
                detail: "How many times a stamp's verification page was visited. Used to detect reuse — if a personal stamp is verified by 50 different people, that's a signal it was copied and forwarded.",
              },
            ].map(({ title, detail }, i, arr) => (
              <div key={title} className={`flex gap-4 p-5 ${i < arr.length - 1 ? "border-b border-[#f0ede6]" : ""}`}>
                <span className="text-[#5a9471] font-bold text-[16px] shrink-0 mt-0.5">·</span>
                <div className="flex flex-col gap-1">
                  <p className="text-[14px] font-semibold text-[#1a1917]">{title}</p>
                  <p className="text-[13px] text-[#6b6560] leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cloudflare Turnstile */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-[#b5b0a6] uppercase tracking-wider">Cloudflare Turnstile</h2>
          <div className="bg-white border border-[#e5e2d8] rounded-xl p-6 flex flex-col gap-3">
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              Every stamp requires a human verification check powered by{" "}
              <a href="https://www.cloudflare.com/products/turnstile/" target="_blank" rel="noopener noreferrer" className="text-[#5a9471] hover:underline">Cloudflare Turnstile</a>.
              This runs silently in the background — no checkbox, no puzzle, just a signal that confirms you&apos;re a real person using a real browser.
            </p>
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              Cloudflare processes this challenge entirely on their infrastructure. We receive only a short-lived pass/fail token which we verify server-side. We do not store it, log it, or use it for any other purpose. Cloudflare&apos;s own{" "}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-[#5a9471] hover:underline">privacy policy</a>{" "}
              governs what they collect during that check.
            </p>
          </div>
        </section>

        {/* Open source */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-[#b5b0a6] uppercase tracking-wider">Open source</h2>
          <div className="bg-white border border-[#e5e2d8] rounded-xl p-6 flex flex-col gap-3">
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              You don&apos;t have to take our word for any of this. The full source code — including the Chrome extension, the web app, and the API — is publicly available on{" "}
              <a href="https://github.com/AlexFloyd13/signedinbox" target="_blank" rel="noopener noreferrer" className="text-[#5a9471] hover:underline">GitHub</a>{" "}
              under the MIT license. The hashing logic described above is in{" "}
              <code className="text-[12px] bg-[#f5f4ef] px-1.5 py-0.5 rounded text-[#1a1917]">extension/background/background.ts</code>.
            </p>
            <p className="text-[14px] text-[#6b6560] leading-relaxed">
              Public signing keys for independent stamp verification are available at{" "}
              <a href="/api/v1/.well-known/signedinbox" target="_blank" rel="noopener noreferrer" className="text-[#5a9471] hover:underline font-mono text-[13px]">/api/v1/.well-known/signedinbox</a>.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-[#f0f7f3] border border-[#b8d4c0] rounded-xl p-6 flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[#1e4533]">Questions?</p>
          <p className="text-[13px] text-[#5a9471] leading-relaxed">
            Open an issue on GitHub or email{" "}
            <a href="mailto:alex@signedinbox.com" className="underline">alex@signedinbox.com</a>.
          </p>
        </section>

      </main>

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
