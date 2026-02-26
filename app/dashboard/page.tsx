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
  const [tab, setTab] = useState<"stamp" | "history" | "settings">("stamp");

  const [stats, setStats] = useState<Stats | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stampResult, setStampResult] = useState<StampResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [stampsTotal, setStampsTotal] = useState(0);
  const [stampsLoading, setStampsLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newSenderName, setNewSenderName] = useState("");
  const [newSenderEmail, setNewSenderEmail] = useState("");
  const [addingSender, setAddingSender] = useState(false);
  const [senderError, setSenderError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [addingKey, setAddingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);
  const [integrationKeyValue, setIntegrationKeyValue] = useState<string | null>(null);

  const [emailBodyText, setEmailBodyText] = useState("");
  const [localContentHash, setLocalContentHash] = useState<string | null>(null);

  const [verifyingCode, setVerifyingCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyEmailError, setVerifyEmailError] = useState<string | null>(null);

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
  }, [fetchSenders, fetchStats]);

  useEffect(() => {
    if (tab === "history") fetchStamps();
    if (tab === "settings") { fetchSenders(); fetchApiKeys(); }
  }, [tab, fetchStamps, fetchSenders, fetchApiKeys]);

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
    if (!selectedSender || !turnstileToken) return;
    setGenerating(true);
    setGenerateError(null);
    setStampResult(null);
    try {
      const hash = await computeContentHash();
      setLocalContentHash(hash);
      const body: Record<string, string> = {
        sender_id: selectedSender,
        turnstile_token: turnstileToken,
        client_type: "web",
      };
      if (recipientEmail.trim()) body.recipient_email = recipientEmail.trim();
      if (subjectHint.trim()) body.subject_hint = subjectHint.trim();
      if (hash) body.content_hash = hash;

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

  async function addApiKey() {
    if (!newKeyName.trim()) return;
    setAddingKey(true);
    setKeyError(null);
    setNewKeyValue(null);
    try {
      const res = await authedFetch("/api/v1/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-api-key", name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create API key");
      setNewKeyValue(data.api_key);
      setNewKeyName("");
      await fetchApiKeys();
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Failed to create API key");
    } finally {
      setAddingKey(false);
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

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1a1917] tracking-tight">SignedInbox</h1>
        <p className="text-[#9a958e] text-sm mt-1">
          Cryptographic stamps for your emails — prove you&apos;re a real human sender.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Stamps", value: stats ? String(stats.total_stamps) : "—" },
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e5e2d8]">
        {(["stamp", "history", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-[#5a9471] text-[#1a1917]" : "border-transparent text-[#9a958e] hover:text-[#3a3830]"
            }`}
          >
            {t === "stamp" ? "New Stamp" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Stamp Tab */}
      {tab === "stamp" && (
        <div className="flex flex-col gap-4">
          {senders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#b5b0a6]">
              <span className="text-4xl">✉️</span>
              <p className="text-sm">No senders yet — add one in Settings</p>
              <button onClick={() => setTab("settings")} className="text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors">
                Go to Settings
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h2 className="font-serif text-base font-semibold text-[#1a1917]">Generate Verification Stamp</h2>
                <p className="text-xs text-[#9a958e] mt-1">Complete the CAPTCHA, then paste the badge into your email.</p>
              </div>

              {generateError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                  {generateError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#9a958e]">Sender *</label>
                  <select
                    className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] focus:outline-none focus:border-[#5a9471]"
                    value={selectedSender}
                    onChange={(e) => setSelectedSender(e.target.value)}
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name} &lt;{s.email}&gt;{!s.verified_email ? " (unverified)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#9a958e]">Recipient Email (optional)</label>
                  <input
                    className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#9a958e]">Subject Hint (optional)</label>
                  <input
                    className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                    placeholder="e.g. Job application, Invoice #1234"
                    maxLength={100}
                    value={subjectHint}
                    onChange={(e) => setSubjectHint(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#9a958e]">Email Body (optional — cryptographically binds stamp to this content)</label>
                  <textarea
                    className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471] min-h-[80px] resize-y"
                    placeholder="Paste your email body text to bind this stamp to the exact content…"
                    value={emailBodyText}
                    onChange={(e) => setEmailBodyText(e.target.value)}
                  />
                  {emailBodyText && (
                    <p className="text-xs text-[#b5b0a6]">Content hash will be included in the Ed25519 signature.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#9a958e]">Human Verification *</label>
                  {siteKey ? (
                    <Turnstile
                      siteKey={siteKey}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                      options={{ theme: "light" }}
                    />
                  ) : (
                    <div className="text-xs text-[#9a958e] bg-white border border-[#e5e2d8] rounded-lg px-3 py-2">
                      Turnstile not configured — dev mode
                      <button className="ml-2 text-[#5a9471] underline" onClick={() => setTurnstileToken("dev-token")}>
                        Use dev token
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={generateStamp}
                    disabled={!selectedSender || (!turnstileToken && !!siteKey) || generating}
                    className="text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
                  >
                    {generating ? "Generating…" : "Generate Stamp"}
                  </button>
                </div>
              </div>

              {stampResult && (
                <div className="border-t border-[#e5e2d8] pt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#5a9471] bg-[#f0f7f3] border-[#b8d4c0] px-2 py-0.5 rounded-full text-xs border">✓ Stamp Created</span>
                    <span className="text-xs text-[#9a958e]">Expires {formatDate(stampResult.expires_at)}</span>
                    {localContentHash && (
                      <span className="text-xs text-[#9a958e] font-mono">Content hash: {localContentHash.slice(0, 16)}…</span>
                    )}
                  </div>

                  {[
                    { label: "Stamp URL", value: stampResult.stamp_url, field: "url" },
                    { label: "HTML Badge (paste into email HTML)", value: stampResult.badge_html, field: "html" },
                    { label: "Plain Text Badge", value: stampResult.badge_text, field: "text" },
                  ].map(({ label, value, field }) => (
                    <div key={field} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[#9a958e]">{label}</label>
                        <button onClick={() => copyToClipboard(value, field)} className="text-xs text-[#6b6560] hover:text-[#1a1917] transition-colors">
                          {copiedField === field ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-xs text-[#6b6560] break-all font-mono overflow-x-auto">
                        {value}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#b5b0a6]">Preview:</span>
                    <a
                      href={stampResult.stamp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", background: "#5a9471", color: "#fff", fontSize: "12px", fontFamily: "system-ui, sans-serif", textDecoration: "none" }}
                    >
                      ✍ SignedInbox Verified
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="flex flex-col gap-3">
          {stampsLoading ? (
            <div className="flex items-center justify-center py-16 text-[#b5b0a6] text-sm">Loading…</div>
          ) : stamps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#b5b0a6]">
              <span className="text-4xl">✉️</span>
              <p className="text-sm">No stamps yet</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#b5b0a6]">{stampsTotal} total stamps</p>
              {stamps.map((stamp) => (
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
            </>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="flex flex-col gap-6">
          {/* Senders */}
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
                className="text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
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
                            className="text-sm px-3 py-1.5 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors disabled:opacity-40"
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

          {/* Integrations */}
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-[#1a1917]">Integrations</h2>
              <p className="text-xs text-[#9a958e] mt-1">Connect SignedInbox to your tools.</p>
            </div>

            {keyError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{keyError}</div>
            )}

            {/* Chrome Extension */}
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
                          className="self-start text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors disabled:opacity-40">
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
                          <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer"
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

            {/* Claude MCP */}
            {(() => {
              const existing = apiKeys.find((k) => k.name === "Claude MCP");
              const isActive = activeIntegration === "mcp";
              const revealed = isActive && integrationKeyValue;
              const keyForConfig = revealed ? integrationKeyValue! : existing ? `${existing.key_prefix}…` : "YOUR_API_KEY";
              const mcpConfig = `{\n  "mcpServers": {\n    "signedinbox": {\n      "command": "npx",\n      "args": ["-y", "@signedinbox/mcp"],\n      "env": {\n        "SIGNEDINBOX_API_KEY": "${keyForConfig}"\n      }\n    }\n  }\n}`;
              return (
                <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f3ef] border border-[#e5e2d8] flex items-center justify-center text-lg shrink-0">🤖</div>
                      <div>
                        <p className="font-serif text-[15px] font-semibold text-[#1a1917]">Claude MCP</p>
                        <p className="text-xs text-[#9a958e] mt-0.5">Let Claude stamp emails on your behalf from any MCP-compatible AI client.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {existing && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f0f7f3] text-[#5a9471] border border-[#b8d4c0]">Configured</span>}
                      <button
                        onClick={() => { setActiveIntegration(isActive ? null : "mcp"); setIntegrationKeyValue(null); setKeyError(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#3a3830] hover:bg-[#f5f3ef] transition-colors"
                      >
                        {isActive ? "Close" : existing ? "View config" : "Set up"}
                      </button>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex flex-col gap-3 border-t border-[#e5e2d8] pt-3">
                      {!existing && !revealed && (
                        <>
                          <p className="text-xs text-[#9a958e]">Generate an API key, then add the config to your Claude desktop <code className="text-[#5a9471]">claude_desktop_config.json</code>.</p>
                          <button onClick={() => setupIntegration("Claude MCP")} disabled={addingKey}
                            className="self-start text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors disabled:opacity-40">
                            {addingKey ? "Generating…" : "Generate API key"}
                          </button>
                        </>
                      )}
                      {(revealed || existing) && (
                        <div className="flex flex-col gap-2">
                          {revealed && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              This key won&apos;t be shown again — it&apos;s already embedded in the config below.
                            </p>
                          )}
                          <p className="text-xs text-[#9a958e]">Add to <code className="text-[#5a9471]">~/Library/Application Support/Claude/claude_desktop_config.json</code>:</p>
                          <div className="relative">
                            <pre className="bg-[#f5f3ef] border border-[#e5e2d8] rounded-lg px-3 py-3 text-xs text-[#3a3830] font-mono overflow-x-auto whitespace-pre">{mcpConfig}</pre>
                            <button onClick={() => copyToClipboard(mcpConfig, "mcp-config")}
                              className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white border border-[#e5e2d8] text-[#6b6560] hover:text-[#1a1917] transition-colors">
                              {copiedField === "mcp-config" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                          {existing && !revealed && (
                            <p className="text-xs text-[#b5b0a6]">{existing.last_used_at ? `Last used ${timeAgo(existing.last_used_at)}` : "Never used"} · Created {formatDate(existing.created_at)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Developer API */}
            {(() => {
              const isActive = activeIntegration === "dev";
              return (
                <div className="bg-white border border-[#e5e2d8] rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f3ef] border border-[#e5e2d8] flex items-center justify-center text-lg shrink-0">⚙️</div>
                      <div>
                        <p className="font-serif text-[15px] font-semibold text-[#1a1917]">Developer API</p>
                        <p className="text-xs text-[#9a958e] mt-0.5">Create a raw API key for custom scripts or integrations.</p>
                      </div>
                    </div>
                    <button onClick={() => { setActiveIntegration(isActive ? null : "dev"); setNewKeyValue(null); setKeyError(null); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e2d8] text-[#3a3830] hover:bg-[#f5f3ef] transition-colors shrink-0">
                      {isActive ? "Close" : "Manage"}
                    </button>
                  </div>
                  {isActive && (
                    <div className="flex flex-col gap-3 border-t border-[#e5e2d8] pt-3">
                      {newKeyValue && (
                        <div className="flex items-center gap-2 bg-[#f0f7f3] border border-[#b8d4c0] rounded-lg px-3 py-2">
                          <code className="text-xs text-[#1a1917] font-mono break-all flex-1">{newKeyValue}</code>
                          <button onClick={() => copyToClipboard(newKeyValue, "new-key")} className="shrink-0 text-xs text-[#6b6560] hover:text-[#1a1917] transition-colors">
                            {copiedField === "new-key" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <input
                          className="flex-1 bg-white border border-[#e5e2d8] rounded-lg px-3 py-2 text-sm text-[#1a1917] placeholder:text-[#c5c0b8] focus:outline-none focus:border-[#5a9471]"
                          placeholder="Key name"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                        <button onClick={addApiKey} disabled={!newKeyName.trim() || addingKey}
                          className="text-sm px-4 py-2 rounded-lg bg-[#5a9471] text-[#1a1917] font-medium hover:bg-[#477857] transition-colors disabled:opacity-40">
                          {addingKey ? "Creating…" : "Create"}
                        </button>
                      </div>
                      {apiKeysLoading ? (
                        <div className="text-center text-[#b5b0a6] text-sm py-2">Loading…</div>
                      ) : apiKeys.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-[#e5e2d8] pt-3">
                          {apiKeys.map((k) => (
                            <div key={k.id} className="flex flex-col gap-0.5">
                              <span className="text-xs text-[#1a1917]">{k.name}</span>
                              <span className="text-xs text-[#9a958e] font-mono">{k.key_prefix}…</span>
                              <span className="text-xs text-[#b5b0a6]">{k.last_used_at ? `Last used ${timeAgo(k.last_used_at)}` : "Never used"} · Created {formatDate(k.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
