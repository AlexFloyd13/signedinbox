"use client";

import { useEffect, useState, useCallback } from "react";
import { authedFetch } from "@/lib/supabase/authed-fetch";
import { Turnstile } from "@marsidev/react-turnstile";

interface Sender {
  id: string;
  display_name: string;
  email: string;
  verified_email: boolean;
  total_stamps: number;
  created_at: string;
}

interface Stamp {
  id: string;
  sender_id: string;
  recipient_email: string | null;
  subject_hint: string | null;
  verification_method: string;
  client_type: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
}

interface Stats {
  total_stamps: number;
  total_validations: number;
  stamps_this_period: number;
  validations_this_period: number;
}

interface StampResult {
  stamp_id: string;
  stamp_url: string;
  badge_html: string;
  badge_text: string;
  signature: string;
  expires_at: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {

  const [stats, setStats] = useState<Stats | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [bindExpanded, setBindExpanded] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stampResult, setStampResult] = useState<StampResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [stampsTotal, setStampsTotal] = useState(0);
  const [stampsLoading, setStampsLoading] = useState(false);
  const [stampsOpen, setStampsOpen] = useState(false);
  const [stampsPage, setStampsPage] = useState(0);
  const [revoking, setRevoking] = useState<string | null>(null);
  const STAMPS_PER_PAGE = 5;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newSenderName, setNewSenderName] = useState("");
  const [newSenderEmail, setNewSenderEmail] = useState("");
  const [addingSender, setAddingSender] = useState(false);
  const [senderError, setSenderError] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);
  const [integrationKeyValue, setIntegrationKeyValue] = useState<string | null>(null);

  const [emailBodyText, setEmailBodyText] = useState("");
  const [localContentHash, setLocalContentHash] = useState<string | null>(null);
  const [isMassSend, setIsMassSend] = useState(false);
  const [declaredRecipientCount, setDeclaredRecipientCount] = useState("");
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);

  const [verifyingCode, setVerifyingCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyEmailError, setVerifyEmailError] = useState<string | null>(null);

  const [addEmailOpen, setAddEmailOpen] = useState(false);
  const [addEmailStep, setAddEmailStep] = useState<"form" | "verify">("form");
  const [addEmailName, setAddEmailName] = useState("");
  const [addEmailAddress, setAddEmailAddress] = useState("");
  const [addEmailSenderId, setAddEmailSenderId] = useState("");
  const [addEmailCode, setAddEmailCode] = useState("");
  const [addEmailLoading, setAddEmailLoading] = useState(false);
  const [addEmailError, setAddEmailError] = useState<string | null>(null);

  const fetchSenders = useCallback(async () => {
    try {
      const res = await authedFetch("/api/v1/stamps?action=senders");
      if (res.ok) {
        const data = await res.json();
        let sendersList: Sender[] = data.senders ?? [];

        // First visit: auto-add the user's auth email as a verified sender
        if (sendersList.length === 0) {
          const claimRes = await authedFetch("/api/v1/stamps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "claim-auth-email" }),
          });
          if (claimRes.ok) {
            const claimData = await claimRes.json();
            sendersList = [claimData.sender];
          }
        }

        setSenders(sendersList);
        if (sendersList.length > 0 && !selectedSender) {
          setSelectedSender(sendersList[0].id);
        }
      }
    } catch { /* ignore */ }
  }, [selectedSender]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authedFetch("/api/v1/stamps?action=stats&days=30");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchStamps = useCallback(async () => {
    setStampsLoading(true);
    try {
      const res = await authedFetch("/api/v1/stamps?limit=50");
      if (res.ok) {
        const data = await res.json();
        setStamps(data.stamps ?? []);
        setStampsTotal(data.total ?? 0);
      }
    } catch { /* ignore */ }
    finally { setStampsLoading(false); }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    try {
      const res = await authedFetch("/api/v1/stamps?action=api-keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys ?? []);
      }
    } catch { /* ignore */ }
    finally { setApiKeysLoading(false); }
  }, []);

  useEffect(() => {
    fetchSenders();
    fetchStats();
    fetchStamps();
    fetchApiKeys();
  }, [fetchSenders, fetchStats, fetchStamps, fetchApiKeys]);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // In dev mode (no Turnstile configured), auto-apply token so no manual click needed
  useEffect(() => {
    if (!siteKey) setTurnstileToken("dev-token");
  }, [siteKey]);

  async function computeContentHash(): Promise<string | null> {
    if (!emailBodyText.trim()) return null;
    const input = `${recipientEmail.toLowerCase()}|${subjectHint}|${emailBodyText.trim()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function generateStamp() {
    if (!selectedSender) return;
    const token = turnstileToken || "no-captcha";
    setGenerating(true);
    setGenerateError(null);
    setStampResult(null);
    try {
      const hash = await computeContentHash();
      setLocalContentHash(hash);
      const body: Record<string, unknown> = {
        sender_id: selectedSender,
        turnstile_token: token,
        client_type: "web",
        is_mass_send: isMassSend,
      };
      if (recipientEmail.trim()) body.recipient_email = recipientEmail.trim();
      if (subjectHint.trim()) body.subject_hint = subjectHint.trim();
      if (hash) body.content_hash = hash;
      if (isMassSend && declaredRecipientCount.trim()) {
        const n = parseInt(declaredRecipientCount.trim(), 10);
        if (!isNaN(n) && n > 0) body.declared_recipient_count = n;
      }

      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate stamp");
      setStampResult(data);
      fetchStats();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate stamp");
    } finally {
      setGenerating(false);
      setTurnstileToken(null);
    }
  }

  async function sendVerificationCode(senderId: string) {
    setVerifyingCode(senderId);
    setVerifyEmailError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-verification", sender_id: senderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
    } catch (e) {
      setVerifyEmailError(e instanceof Error ? e.message : "Failed to send code");
    }
  }

  async function submitVerificationCode(senderId: string) {
    if (!verificationCodeInput.trim()) return;
    setVerifyingEmail(true);
    setVerifyEmailError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-email", sender_id: senderId, code: verificationCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setVerifyingCode(null);
      setVerificationCode("");
      setVerificationCodeInput("");
      await fetchSenders();
    } catch (e) {
      setVerifyEmailError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setVerifyingEmail(false);
    }
  }

  async function revokeStamp(stampId: string) {
    setRevoking(stampId);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", stamp_id: stampId }),
      });
      if (res.ok) {
        setStamps((prev) => prev.map((s) => s.id === stampId ? { ...s, revoked: true } : s));
      }
    } catch { /* ignore */ }
    finally { setRevoking(null); }
  }

  async function startAddEmail() {
    if (!addEmailName.trim() || !addEmailAddress.trim()) return;
    setAddEmailLoading(true);
    setAddEmailError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-sender", display_name: addEmailName.trim(), email: addEmailAddress.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add email");
      setAddEmailSenderId(data.sender.id);
      const vres = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-verification", sender_id: data.sender.id }),
      });
      if (!vres.ok) throw new Error("Failed to send verification code");
      setAddEmailStep("verify");
    } catch (e) {
      setAddEmailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAddEmailLoading(false);
    }
  }

  async function confirmAddEmail() {
    if (addEmailCode.length !== 6 || !addEmailSenderId) return;
    setAddEmailLoading(true);
    setAddEmailError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-email", sender_id: addEmailSenderId, code: addEmailCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      const newId = addEmailSenderId;
      setAddEmailOpen(false);
      setAddEmailStep("form");
      setAddEmailName("");
      setAddEmailAddress("");
      setAddEmailCode("");
      setAddEmailSenderId("");
      setAddEmailError(null);
      await fetchSenders();
      setSelectedSender(newId);
    } catch (e) {
      setAddEmailError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setAddEmailLoading(false);
    }
  }

  async function addSender() {
    if (!newSenderName.trim() || !newSenderEmail.trim()) return;
    setAddingSender(true);
    setSenderError(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-sender", display_name: newSenderName.trim(), email: newSenderEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add sender");
      setNewSenderName("");
      setNewSenderEmail("");
      await fetchSenders();
    } catch (e) {
      setSenderError(e instanceof Error ? e.message : "Failed to add sender");
    } finally {
      setAddingSender(false);
    }
  }

  async function setupIntegration(name: string) {
    setAddingKey(true);
    setKeyError(null);
    setIntegrationKeyValue(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-api-key", name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setIntegrationKeyValue(data.api_key);
      await fetchApiKeys();
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setAddingKey(false);
    }
  }

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { /* ignore */ }
  }


  return (
    <div className="flex flex-col gap-6">
      {/* Generate Stamp */}
      <div className="flex flex-col gap-4">
        {senders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#b5b0a6] bg-white border border-[#e5e2d8] rounded-xl">
            <span className="text-4xl">✉️</span>
            <p className="text-sm">No senders yet — add one below</p>
          </div>
        ) : (
            <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h2 className="font-serif text-base font-semibold text-[#1a1917]">Generate Verification Stamp</h2>
                <p className="text-xs text-[#9a958e] mt-1">Fill in the details below, then paste the badge into your email.</p>
              </div>

              {generateError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                  {generateError}
                </div>
              )}

              <div className="flex flex-col gap-3">

                {/* Sender — custom dropdown + bind toggle snug below */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#9a958e] mb-1">Sender *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSenderDropdownOpen((o) => !o)}
                      className="w-full flex items-center justify-between bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-left hover:border-[#5a9471] focus:outline-none focus:border-[#5a9471] transition-colors"
                    >
                      <span className={selectedSender && senders.find(s => s.id === selectedSender) ? "text-[#1a1917]" : "text-[#c5c0b8]"}>
                        {(() => {
                          const s = senders.find(s => s.id === selectedSender);
                          return s ? `${s.display_name} <${s.email}>` : "Select sender…";
                        })()}
                      </span>
                      <span className={`text-[#9a958e] text-xs ml-2 transition-transform duration-150 ${senderDropdownOpen ? "rotate-180" : ""}`}>▼</span>
                    </button>

                    {senderDropdownOpen && (
                      <>
                        {/* Backdrop to close on outside click */}
                        <div className="fixed inset-0 z-10" onClick={() => setSenderDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e2d8] rounded-xl shadow-lg z-20 overflow-hidden">
                          {senders.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { setSelectedSender(s.id); setSenderDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 hover:bg-[#f5f4ef] transition-colors ${selectedSender === s.id ? "bg-[#f0f7f3]" : ""}`}
                            >
                              <div className={`text-sm ${selectedSender === s.id ? "text-[#3d6b52] font-medium" : "text-[#1a1917]"}`}>{s.display_name}</div>
                              <div className="text-xs text-[#9a958e]">{s.email}{!s.verified_email ? " · unverified" : ""}</div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => { setSenderDropdownOpen(false); setAddEmailOpen(true); setAddEmailStep("form"); setAddEmailError(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#5a9471] font-medium hover:bg-[#f0f7f3] transition-colors border-t border-[#e5e2d8] flex items-center gap-1.5"
                          >
                            + Add new sender
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add email form */}
                  {addEmailOpen && (
                    <div className="border border-[#e5e2d8] rounded-xl p-4 flex flex-col gap-3 bg-[#fafaf8]">
                      {addEmailStep === "form" ? (
                        <>
                          <p className="text-[12px] font-medium text-[#3a3830]">Add another email address</p>
                          <input
                            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                            placeholder="Display name"
                            value={addEmailName}
                            onChange={(e) => setAddEmailName(e.target.value)}
                          />
                          <input
                            type="email"
                            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                            placeholder="email@example.com"
                            value={addEmailAddress}
                            onChange={(e) => setAddEmailAddress(e.target.value)}
                          />
                          {addEmailError && <p className="text-[12px] text-red-600">{addEmailError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={startAddEmail}
                              disabled={!addEmailName.trim() || !addEmailAddress.trim() || addEmailLoading}
                              className="flex-1 bg-[#3d6b52] hover:bg-[#2d5040] disabled:opacity-50 text-white rounded-lg py-2 text-[13px] font-medium transition-colors"
                            >
                              {addEmailLoading ? "Sending…" : "Send verification code"}
                            </button>
                            <button onClick={() => setAddEmailOpen(false)} className="px-3 py-2 text-[13px] text-[#9a958e] hover:text-[#5a5750] transition-colors">Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[12px] font-medium text-[#3a3830]">
                            Enter the 6-digit code sent to <span className="text-[#1a1917]">{addEmailAddress}</span>
                          </p>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={addEmailCode}
                            onChange={(e) => setAddEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="000000"
                            autoFocus
                            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-[18px] text-[#1a1917] text-center font-mono tracking-[0.3em] placeholder:tracking-normal placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                          />
                          {addEmailError && <p className="text-[12px] text-red-600">{addEmailError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={confirmAddEmail}
                              disabled={addEmailCode.length !== 6 || addEmailLoading}
                              className="flex-1 bg-[#3d6b52] hover:bg-[#2d5040] disabled:opacity-50 text-white rounded-lg py-2 text-[13px] font-medium transition-colors"
                            >
                              {addEmailLoading ? "Verifying…" : "Verify"}
                            </button>
                            <button onClick={() => setAddEmailStep("form")} className="px-3 py-2 text-[13px] text-[#9a958e] hover:text-[#5a5750] transition-colors">Back</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                </div>

                {/* Human verification + bind + generate (tight group) */}
                <div className="flex flex-col gap-2">
                  {siteKey && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#9a958e]">Human Verification *</label>
                      <Turnstile
                        siteKey={siteKey}
                        onSuccess={(token) => { setTurnstileToken(token); setTurnstileError(null); }}
                        onError={() => { setTurnstileToken(null); setTurnstileError("Verification failed — please refresh the page and try again."); }}
                        onExpire={() => { setTurnstileToken(null); setTurnstileError("Verification expired — please complete it again."); }}
                        options={{ theme: "light" }}
                      />
                      {turnstileError && (
                        <p className="text-xs text-red-500 mt-1">{turnstileError}</p>
                      )}
                    </div>
                  )}

                  {/* Mass email — row above bind/generate */}
                  <div>
                    <div className="flex mb-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isMassSend}
                          onChange={(e) => { setIsMassSend(e.target.checked); if (!e.target.checked) setDeclaredRecipientCount(""); }}
                          className="w-3.5 h-3.5 rounded border-[#d0cdc6] accent-[#9a958e]"
                        />
                        <span className="text-xs text-[#b5b0a6]">Mass email</span>
                        {isMassSend && (
                          <input
                            type="number"
                            min="2"
                            className="w-20 bg-white border border-[#e5e2d8] rounded-md px-2 py-0.5 text-xs text-[#9a958e] placeholder:text-[#d0cdc6] focus:outline-none focus:border-[#9a958e]"
                            placeholder="# recipients"
                            value={declaredRecipientCount}
                            onChange={(e) => setDeclaredRecipientCount(e.target.value)}
                          />
                        )}
                        <div className="group/tip relative">
                          <span className="text-[#d0cdc6] cursor-help text-xs">ⓘ</span>
                          <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#1a1917] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                            Check this if sending to multiple recipients. Multiple verifications won&apos;t trigger a reuse warning. <span className="text-amber-300 font-medium">Accounts using single-recipient stamps as mass emails without this checked will be flagged.</span>
                            <div className="absolute top-full right-4 border-4 border-transparent border-t-[#1a1917]" />
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Bind toggle + generate on same row */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setBindExpanded(!bindExpanded)}
                        className="flex items-center gap-1.5 text-xs text-[#9a958e] hover:text-[#3a3830] transition-colors"
                      >
                        <span className={`transition-transform ${bindExpanded ? "rotate-90" : ""}`}>▶</span>
                        Bind to email content
                        {(recipientEmail || subjectHint || emailBodyText) && (
                          <span className="text-[#5a9471] font-medium">✓</span>
                        )}
                      </button>
                      <button
                        onClick={generateStamp}
                        disabled={!selectedSender || (!!siteKey && !turnstileToken) || generating}
                        className="text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
                      >
                        {generating ? "Generating…" : "Generate Stamp"}
                      </button>
                    </div>
                    {bindExpanded && (
                      <div className="flex flex-col gap-3 pl-4 border-l-2 border-[#e5e2d8] mt-2">
                        <p className="text-xs text-[#b5b0a6]">Cryptographically ties this stamp to the specific email — recipient, subject, and body. Recipients can verify the content hasn&apos;t been altered.</p>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-[#9a958e]">Recipient email</label>
                          <input
                            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                            placeholder="recipient@example.com"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-[#9a958e]">Subject</label>
                          <input
                            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                            placeholder="e.g. Job application, Invoice #1234"
                            maxLength={100}
                            value={subjectHint}
                            onChange={(e) => setSubjectHint(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-[#9a958e]">Email body</label>
                          <textarea
                            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471] min-h-[80px] resize-y"
                            placeholder="Paste your email body text…"
                            value={emailBodyText}
                            onChange={(e) => setEmailBodyText(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {stampResult && (
                <div className="border-t border-[#e5e2d8] pt-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#5a9471] bg-[#f0f7f3] border border-[#b8d4c0] px-2 py-0.5 rounded-full text-xs font-medium">✓ Stamp Created</span>
                    <span className="text-xs text-[#9a958e]">Expires {formatDate(stampResult.expires_at)}</span>
                  </div>

                  {/* Copy Link — primary action */}
                  <div className="flex flex-col gap-2 bg-[#f5f4ef] border border-[#e5e2d8] rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-[#3a3830]">Verification text</span>
                      <button
                        onClick={() => copyToClipboard(stampResult.badge_text, "url")}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors"
                      >
                        {copiedField === "url" ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                    <p className="text-xs text-[#9a958e] leading-relaxed">{stampResult.badge_text}</p>
                  </div>
                  <p className="text-xs text-[#b5b0a6]">Paste at the bottom of your email. Works in Gmail and any email client.</p>

                  {/* HTML badge — secondary, for Outlook/signatures */}
                  <div className="flex items-center justify-between bg-white border border-[#e5e2d8] rounded-lg px-3 py-2.5">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium text-[#3a3830]">HTML badge</span>
                      <span className="text-xs text-[#b5b0a6]">For Outlook, Apple Mail, or email signatures</span>
                    </div>
                    <button onClick={() => copyToClipboard(stampResult.badge_html, "html")} className="shrink-0 ml-3 text-xs text-[#6b6560] hover:text-[#1a1917] transition-colors">
                      {copiedField === "html" ? "Copied!" : "Copy HTML"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Sender Profiles */}
      <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-serif text-base font-semibold text-[#1a1917]">Sender Profiles</h2>
          <p className="text-xs text-[#9a958e] mt-1">Add the email addresses you send from. Each must be verified.</p>
        </div>
        {senderError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{senderError}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input
            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
            placeholder="Display name *"
            value={newSenderName}
            onChange={(e) => setNewSenderName(e.target.value)}
          />
          <input
            className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
            placeholder="email@example.com *"
            type="email"
            value={newSenderEmail}
            onChange={(e) => setNewSenderEmail(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={addSender}
            disabled={!newSenderName.trim() || !newSenderEmail.trim() || addingSender}
            className="text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
          >
            {addingSender ? "Adding…" : "Add Sender"}
          </button>
        </div>
        {senders.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[#e5e2d8] pt-3">
            {senders.map((s) => (
              <div key={s.id} className="flex flex-col gap-2 py-1">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a1917] text-sm">{s.display_name}</span>
                      {s.verified_email ? (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f0f7f3] text-[#5a9471] border border-[#b8d4c0]">✓ Verified</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">Unverified</span>
                      )}
                    </div>
                    <span className="text-xs text-[#9a958e]">{s.email} · {s.total_stamps} stamps</span>
                  </div>
                  {!s.verified_email && verifyingCode !== s.id && (
                    <button
                      onClick={() => sendVerificationCode(s.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#3a3830] hover:bg-white/5 transition-colors"
                    >
                      Verify Email
                    </button>
                  )}
                </div>
                {verifyingCode === s.id && (
                  <div className="flex flex-col gap-2">
                    {verifyEmailError && <p className="text-xs text-red-400">{verifyEmailError}</p>}
                    {verificationCode && (
                      <p className="text-xs text-amber-400 font-mono">Dev mode — code: {verificationCode}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-white border border-[#e5e2d8] rounded-lg px-3 py-1.5 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        value={verificationCodeInput}
                        onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <button
                        onClick={() => submitVerificationCode(s.id)}
                        disabled={verificationCodeInput.length !== 6 || verifyingEmail}
                        className="text-sm px-3 py-1.5 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
                      >
                        {verifyingEmail ? "…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => { setVerifyingCode(null); setVerificationCode(""); setVerificationCodeInput(""); }}
                        className="text-sm px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#6b6560] hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Stamps — clickable, expands history below */}
        <button
          onClick={() => { setStampsOpen((o) => !o); setStampsPage(0); }}
          className={`text-left bg-white border rounded-xl p-5 flex flex-col gap-1 transition-colors hover:border-[#b8d4c0] hover:bg-[#fafdf9] ${stampsOpen ? "border-[#b8d4c0] bg-[#fafdf9]" : "border-[#e5e2d8]"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9a958e]">Total Stamps</span>
            <span className={`text-[#b5b0a6] text-[10px] transition-transform duration-200 ${stampsOpen ? "rotate-180" : ""}`}>▼</span>
          </div>
          <span className="text-xl font-semibold tabular-nums">{stats ? String(stats.total_stamps) : "—"}</span>
        </button>

        {[
          { label: "Stamps (30d)", value: stats ? String(stats.stamps_this_period) : "—" },
          { label: "Total Verifications", value: stats ? String(stats.total_validations) : "—" },
          { label: "Verifications (30d)", value: stats ? String(stats.validations_this_period) : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-1">
            <span className="text-xs text-[#9a958e]">{s.label}</span>
            <span className="text-xl font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Stamp history — expands when Total Stamps is clicked */}
      {stampsOpen && (
        <div className="flex flex-col gap-2">
          {stampsLoading ? (
            <div className="flex items-center justify-center py-10 text-[#b5b0a6] text-sm">Loading…</div>
          ) : stamps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#b5b0a6]">
              <p className="text-sm">No stamps yet</p>
            </div>
          ) : (
            <>
              {stamps.slice(stampsPage * STAMPS_PER_PAGE, (stampsPage + 1) * STAMPS_PER_PAGE).map((stamp) => (
                <div key={stamp.id} className="bg-white border border-[#e5e2d8] rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-[#6b6560]">{stamp.id.slice(0, 8)}…</span>
                      {stamp.revoked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-red-400 bg-red-400/10 border-red-400/20">Revoked</span>
                      ) : new Date(stamp.expires_at) < new Date() ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-[#6b6560] bg-zinc-400/10 border-zinc-400/20">Expired</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-[#5a9471] bg-[#f0f7f3] border-[#b8d4c0]">Valid</span>
                      )}
                      <span className="text-xs text-[#b5b0a6]">{stamp.client_type}</span>
                    </div>
                    {stamp.recipient_email && <p className="text-xs text-[#9a958e]">To: {stamp.recipient_email}</p>}
                    {stamp.subject_hint && <p className="text-xs text-[#9a958e]">Re: {stamp.subject_hint}</p>}
                    <p className="text-xs text-[#b5b0a6]">Created {timeAgo(stamp.created_at)} · Expires {formatDate(stamp.expires_at)}</p>
                  </div>
                  {!stamp.revoked && new Date(stamp.expires_at) > new Date() && (
                    <button
                      onClick={() => revokeStamp(stamp.id)}
                      disabled={revoking === stamp.id}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {revoking === stamp.id ? "…" : "Revoke"}
                    </button>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {stampsTotal > STAMPS_PER_PAGE && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setStampsPage((p) => Math.max(0, p - 1))}
                    disabled={stampsPage === 0}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#6b6560] hover:bg-[#f5f4ef] transition-colors disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-[#b5b0a6] tabular-nums">
                    {stampsPage * STAMPS_PER_PAGE + 1}–{Math.min((stampsPage + 1) * STAMPS_PER_PAGE, stampsTotal)} of {stampsTotal}
                  </span>
                  <button
                    onClick={() => setStampsPage((p) => p + 1)}
                    disabled={(stampsPage + 1) * STAMPS_PER_PAGE >= stamps.length}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#6b6560] hover:bg-[#f5f4ef] transition-colors disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Chrome Extension */}
      {keyError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{keyError}</div>
      )}
      {(() => {
        const existing = apiKeys.find((k) => k.name === "Chrome Extension");
        const isActive = activeIntegration === "chrome";
        const revealed = isActive && integrationKeyValue;
        return (
          <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f5f3ef] border border-[#e5e2d8] flex items-center justify-center text-lg shrink-0">🧩</div>
                <div>
                  <p className="font-serif text-[15px] font-semibold text-[#1a1917]">Chrome Extension</p>
                  <p className="text-xs text-[#9a958e] mt-0.5">Stamp emails from Gmail or Outlook without leaving your browser.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {existing && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f0f7f3] text-[#5a9471] border border-[#b8d4c0]">Connected</span>}
                <button
                  onClick={() => { setActiveIntegration(isActive ? null : "chrome"); setIntegrationKeyValue(null); setKeyError(null); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#3a3830] hover:bg-[#f5f3ef] transition-colors"
                >
                  {isActive ? "Close" : existing ? "View setup" : "Connect"}
                </button>
              </div>
            </div>
            {isActive && (
              <div className="flex flex-col gap-3 border-t border-[#e5e2d8] pt-3">
                {!existing && !revealed && (
                  <button onClick={() => setupIntegration("Chrome Extension")} disabled={addingKey}
                    className="self-start text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-white font-medium hover:bg-[#477857] transition-colors disabled:opacity-40">
                    {addingKey ? "Generating…" : "Generate API key"}
                  </button>
                )}
                {(revealed || existing) && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[#9a958e]">
                      {revealed ? "Copy this key — it won't be shown again. Paste it in the extension's Settings page." : "Your extension is connected. Regenerate if you need a new key."}
                    </p>
                    {revealed ? (
                      <div className="flex items-center gap-2 bg-[#f0f7f3] border border-[#b8d4c0] rounded-lg px-3 py-2">
                        <code className="text-xs text-[#1a1917] font-mono break-all flex-1">{integrationKeyValue}</code>
                        <button onClick={() => copyToClipboard(integrationKeyValue!, "chrome-key")} className="shrink-0 text-xs text-[#6b6560] hover:text-[#1a1917] transition-colors">
                          {copiedField === "chrome-key" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#f5f3ef] border border-[#e5e2d8] rounded-lg px-3 py-2">
                        <code className="text-xs text-[#9a958e] font-mono">{existing!.key_prefix}…</code>
                        <span className="text-xs text-[#b5b0a6] ml-auto">{existing!.last_used_at ? `Last used ${timeAgo(existing!.last_used_at)}` : "Never used"}</span>
                      </div>
                    )}
                    <a href="https://chromewebstore.google.com/detail/signedinbox" target="_blank" rel="noopener noreferrer"
                      className="self-start text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#3a3830] hover:bg-[#f5f3ef] transition-colors">
                      Get extension →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
