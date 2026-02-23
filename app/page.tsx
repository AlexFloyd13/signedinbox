import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✍️</span>
          <span className="font-bold text-xl text-indigo-600">SignedInbox</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/login" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <span>🔐</span> Ed25519 cryptographic signatures
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Prove your emails are<br />
          <span className="text-indigo-600">from a real human</span>
        </h1>
        <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
          SignedInbox stamps every email you send with a cryptographic signature. Recipients can verify in one click — no plugins, no trust required.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/login" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-lg">
            Start for free
          </Link>
          <Link href="/verify/demo" className="text-indigo-600 px-6 py-3 rounded-lg font-medium border border-indigo-200 hover:bg-indigo-50 transition-colors text-lg">
            See a verification
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "✉️", title: "Add your email", desc: "Verify ownership of your email address. A 6-digit code is sent to confirm you control it." },
              { step: "2", icon: "✍️", title: "Stamp your email", desc: "Before sending, generate a stamp. Your email content is hashed and signed with an Ed25519 private key." },
              { step: "3", icon: "✅", title: "Recipients verify", desc: "Anyone can click the verification link and independently confirm the signature is valid — no account needed." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Cryptographically sound</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: "🔑", title: "Real Ed25519 signatures", desc: "Every stamp is signed with an Ed25519 private key. The verification endpoint performs a real cryptographic check — it never just trusts the database." },
            { icon: "🔒", title: "Content binding", desc: "The stamp can be cryptographically bound to your specific email content (recipient + subject + body). Stamps can't be reused on different emails." },
            { icon: "✉️", title: "Sender ownership proof", desc: "Email addresses must be verified before any stamps can be created. You can't claim someone else's identity." },
            { icon: "🌐", title: "Public key transparency", desc: "All signing public keys are published at /.well-known/signedinbox. Anyone can verify stamps offline without using our API." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-4 p-4">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start proving your emails today</h2>
          <p className="text-indigo-200 mb-8">Free to use. No credit card required.</p>
          <Link href="/login" className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-block">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span>✍️ SignedInbox — signedinbox.com</span>
          <div className="flex gap-6">
            <a href="/.well-known/signedinbox" className="hover:text-gray-600">Public Keys</a>
            <a href="/privacy" className="hover:text-gray-600">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
