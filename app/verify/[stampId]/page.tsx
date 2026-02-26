import Link from "next/link";
import { validateStamp } from "@/lib/signedinbox/stamps";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ stampId: string }>;
}) {
  const { stampId } = await params;

  const result = stampId === "demo" ? {
    valid: true,
    stamp: {
      id: "demo",
      sender_name: "Alex Floyd",
      sender_email_masked: "a***@example.com",
      verification_method: "email",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      content_hash: null,
    },
    signature_verified: true,
    failure_reason: null,
  } : await validateStamp(stampId, null, null, null);

  const valid = result?.valid === true;
  const stamp = result?.stamp ?? null;
  const failureReason = result?.failure_reason ?? null;
  const signatureVerified = result?.signature_verified === true;
  const contentHash = stamp?.content_hash ?? null;

  function failureMessage(reason: string | null): string {
    switch (reason) {
      case "not_found": return "This stamp does not exist.";
      case "revoked": return "This stamp has been revoked by the sender.";
      case "expired": return "This stamp has expired — stamps are valid for 30 days.";
      case "key_not_found": return "The signing key for this stamp could not be found.";
      case "signature_invalid": return "The cryptographic signature on this stamp is invalid.";
      case "payload_invalid": return "The stamp payload could not be parsed.";
      default: return "This stamp could not be verified.";
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#1a1917] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 h-14 border-b border-[#e5e2d8] bg-white">
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 128 128" fill="none">
            <defs>
              <linearGradient id="vBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6b9e7e" />
                <stop offset="100%" stopColor="#477857" />
              </linearGradient>
              <linearGradient id="vNib" x1="64" y1="25" x2="64" y2="113" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="64" fill="url(#vBg)" />
            <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            <path d="M64 25 L92 69 L64 113 L36 69 Z" fill="url(#vNib)" />
            <path d="M64 49 L64 113" stroke="#477857" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="64" cy="51" rx="10" ry="7" fill="#477857" />
            <path d="M44 83 Q54 91 64 93 Q74 91 84 83" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[15px] text-[#1a1917]">signedinbox</span>
        </Link>
        <Link href="/dashboard" className="text-[13px] text-[#9a958e] hover:text-[#1a1917] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#eae8e2]">
          Dashboard
        </Link>
      </nav>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md flex flex-col gap-4">

          {/* Status card */}
          <div className={`bg-white border rounded-xl p-8 flex flex-col items-center gap-4 text-center ${
            valid ? "border-[#b8d4c0]" : "border-red-200"
          }`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${
              valid ? "bg-[#f0f7f3] text-[#5a9471]" : "bg-red-50 text-red-500"
            }`}>
              {valid ? "✓" : "✗"}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className={`text-lg font-semibold ${valid ? "text-[#5a9471]" : "text-red-500"}`}>
                {valid ? "Stamp Verified" : "Verification Failed"}
              </h1>
              <p className="text-sm text-[#9a958e]">
                {valid
                  ? "This email was sent by a verified sender whose identity was confirmed at stamp creation."
                  : failureMessage(failureReason)}
              </p>
            </div>
          </div>

          {/* Stamp details */}
          {stamp && (
            <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-[#b5b0a6] uppercase tracking-wider">Stamp Details</h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Sender", value: stamp.sender_name },
                  { label: "Email", value: stamp.sender_email_masked, mono: true },
                  { label: "Verified via", value: stamp.verification_method, capitalize: true },
                  {
                    label: "Signature",
                    value: signatureVerified ? "✓ Ed25519 verified" : "Trusted (legacy stamp)",
                    colored: signatureVerified ? "text-[#5a9471]" : "text-[#9a958e]",
                  },
                  {
                    label: "Content binding",
                    value: contentHash ? "✓ Bound to email content" : "⚠ Not content-bound",
                    colored: contentHash ? "text-[#5a9471]" : "text-amber-600",
                  },
                  { label: "Created", value: formatDate(stamp.created_at) },
                  {
                    label: "Expires",
                    value: formatDate(stamp.expires_at),
                    colored: new Date(stamp.expires_at) < new Date() ? "text-red-500" : undefined,
                  },
                  { label: "Stamp ID", value: `${stamp.id.slice(0, 8)}…`, mono: true, muted: true },
                ].map(({ label, value, mono, capitalize, colored, muted }) => (
                  <div key={label} className="flex justify-between items-center text-sm gap-4">
                    <span className="text-[#9a958e] shrink-0">{label}</span>
                    <span className={`text-right ${colored ?? (muted ? "text-[#b5b0a6]" : "text-[#1a1917]")} ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content hash */}
          {contentHash && (
            <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-[#b5b0a6] uppercase tracking-wider">Verify Email Content</h2>
              <p className="text-xs text-[#9a958e]">
                This stamp was cryptographically bound to specific email content. Paste the email details below to confirm the content hasn&apos;t been altered.
              </p>
              <div className="bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-3 py-2 text-xs text-[#6b6560] font-mono break-all">
                {contentHash}
              </div>
              <p className="text-xs text-[#b5b0a6]">
                Compute SHA-256 of <code className="text-[#5a9471]">recipient_email_lowercase|subject|body_text_trimmed</code> and compare.
              </p>
            </div>
          )}

          {/* Independent verification */}
          <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-[#b5b0a6] uppercase tracking-wider">Independent Verification</h2>
            <p className="text-xs text-[#9a958e]">
              Verify without trusting our servers — public signing keys available at:
            </p>
            <a
              href="/api/v1/.well-known/signedinbox"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#5a9471] hover:underline font-mono break-all"
            >
              /api/v1/.well-known/signedinbox
            </a>
          </div>

          <p className="text-center text-xs text-[#b5b0a6]">
            Powered by{" "}
            <Link href="/" className="text-[#9a958e] hover:text-[#1a1917] transition-colors">
              signedinbox
            </Link>
            {" "}— cryptographic email verification
          </p>
        </div>
      </main>
    </div>
  );
}
