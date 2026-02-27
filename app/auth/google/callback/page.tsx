"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function GoogleCallbackPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);

      const idToken = params.get("id_token");
      const state = params.get("state");
      const storedState = sessionStorage.getItem("google_auth_state");
      const rawNonce = sessionStorage.getItem("google_auth_nonce");
      const redirectTo = sessionStorage.getItem("google_auth_redirect") || "/dashboard";

      // Clean up immediately
      sessionStorage.removeItem("google_auth_state");
      sessionStorage.removeItem("google_auth_nonce");
      sessionStorage.removeItem("google_auth_redirect");

      if (!idToken) {
        setError("No token received from Google.");
        return;
      }

      if (!state || state !== storedState) {
        setError("Invalid state parameter. Please try signing in again.");
        return;
      }

      if (!rawNonce) {
        setError("Missing authentication nonce. Please try signing in again.");
        return;
      }

      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Only allow relative paths to prevent open redirect
      const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
      router.push(safeRedirect);
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f4ef] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 text-[14px] mb-4">{error}</p>
          <a href="/login" className="text-[#5a9471] hover:text-[#477857] text-[14px]">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex items-center justify-center">
      <p className="text-[14px] text-[#9a958e]">Signing in...</p>
    </div>
  );
}
