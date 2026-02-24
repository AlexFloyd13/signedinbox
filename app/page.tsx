import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="text-5xl mb-6">✍️</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          <span className="text-indigo-600">SignedInbox</span>
        </h1>
        <p className="text-lg text-gray-500 mb-2">Coming soon.</p>
        <p className="text-sm text-gray-400 mb-10">
          Cryptographic proof that your emails are from a real human.
        </p>
        <Link
          href="/login"
          className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
