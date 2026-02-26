import Link from "next/link";

async function getStampValidation(stampId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/v1/stamps/${stampId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ stampId: string }>;
}) {
  const { stampId } = await params;

  // Handle demo page
  if (stampId === "demo") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span>✍️</span>
            <span className="font-bold text-indigo-400">signedinbox</span>
          </Link>
        </nav>
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md flex flex-col gap-4">
            <div className="rounded-2xl border bg-indigo-500/5 border-indigo-500/20 p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-indigo-500/15">✓</div>
              <div>
                <h1 className="text-xl font-bold text-indigo-400">signedinbox Verified</h1>
                <p className="text-sm text-zinc-400 mt-1">This is a demo of what a verified stamp looks like.</p>
              </div>
            </div>
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 text-center">
              <p className="text-zinc-400 text-sm">
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 underline">Create your account</Link> to start stamping your emails.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const result = await getStampValidation(stampId);

  const valid = result?.valid === true;
  const stamp = result?.stamp ?? null;
  const failureReason = result?.failure_reason ?? null;
  const signatureVerified = result?.signature_verified === true;
  const contentHash = stamp?.content_hash ?? null;

  function failureMessage(reason: string | null): string {
    switch (reason) {
      case "not_found": return "This stamp does not exist.";
      case "revoked": return "This stamp has been revoked by the sender.";
      case "expired": return "This stamp has expired (stamps are valid for 30 days).";
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <span>✍️</span>
          <span className="font-bold text-indigo-400">signedinbox</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Dashboard
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Status card */}
          <div className={`rounded-2xl border p-8 flex flex-col items-center gap-4 text-center ${
            valid ? "bg-indigo-500/5 border-indigo-500/20" : "bg-red-500/5 border-red-500/20"
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
              valid ? "bg-indigo-500/15" : "bg-red-500/15"
            }`}>
              {valid ? "✓" : "✗"}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className={`text-xl font-bold ${valid ? "text-indigo-400" : "text-red-400"}`}>
                {valid ? "signedinbox Verified" : "Verification Failed"}
              </h1>
              <p className="text-sm text-zinc-400">
                {valid
                  ? "This email was sent by a verified sender whose identity was confirmed at stamp creation."
                  : failureMessage(failureReason)}
              </p>
            </div>
          </div>

          {/* Stamp details */}
          {stamp && (
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stamp Details</h2>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Sender</span>
                  <span className="text-white font-medium">{stamp.sender_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Email</span>
                  <span className="text-white font-mono">{stamp.sender_email_masked}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Verified via</span>
                  <span className="text-white capitalize">{stamp.verification_method}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Signature</span>
                  <span className={signatureVerified ? "text-indigo-400 text-xs" : "text-zinc-500 text-xs"}>
                    {signatureVerified ? "✓ Ed25519 verified" : "Trusted (legacy stamp)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Content binding</span>
                  {contentHash ? (
                    <span className="text-indigo-400 text-xs">✓ Bound to email content</span>
                  ) : (
                    <span className="text-amber-500 text-xs">⚠ Not content-bound</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Stamp created</span>
                  <span className="text-white">{formatDate(stamp.created_at)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Expires</span>
                  <span className={new Date(stamp.expires_at) < new Date() ? "text-red-400" : "text-white"}>
                    {formatDate(stamp.expires_at)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Stamp ID</span>
                  <span className="text-zinc-400 font-mono text-xs">{stamp.id.slice(0, 8)}…</span>
                </div>
              </div>
            </div>
          )}

          {/* Content hash verification */}
          {contentHash && (
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Verify Email Content</h2>
              <p className="text-xs text-zinc-500">
                This stamp was cryptographically bound to specific email content. Paste the email details below to confirm the content hasn&apos;t been altered.
              </p>
              <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-600 font-mono break-all">
                Expected hash: {contentHash}
              </div>
              <p className="text-xs text-zinc-600">
                To verify: compute SHA-256 of <code className="text-zinc-400">recipient_email_lowercase|subject|body_text_trimmed</code> and compare to the hash above.
              </p>
            </div>
          )}

          {/* Independent verification */}
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Independent Verification</h2>
            <p className="text-xs text-zinc-500">
              Verify this stamp without trusting our servers. Public signing keys are available at:
            </p>
            <a
              href="/api/v1/.well-known/signedinbox"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-white font-mono break-all transition-colors"
            >
              /api/v1/.well-known/signedinbox
            </a>
          </div>

          <div className="text-center">
            <p className="text-xs text-zinc-600">
              Powered by{" "}
              <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                signedinbox
              </Link>
              {" "}— cryptographic email verification
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
