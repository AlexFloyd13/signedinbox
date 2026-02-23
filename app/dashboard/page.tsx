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
        setSenders(data.senders ?? []);
        if (data.senders?.length > 0 && !selectedSender) {
          setSelectedSender(data.senders[0].id);
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
      if (data.code) setVerificationCode(data.code);
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
        <h1 className="text-2xl font-bold tracking-tight">SignedInbox</h1>
        <p className="text-zinc-500 text-sm mt-1">
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
          <div key={s.label} className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-1">
            <span className="text-xs text-zinc-500">{s.label}</span>
            <span className="text-xl font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {(["stamp", "history", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-indigo-400 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
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
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
              <span className="text-4xl">✉️</span>
              <p className="text-sm">No senders yet — add one in Settings</p>
              <button onClick={() => setTab("settings")} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
                Go to Settings
              </button>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Generate Verification Stamp</h2>
                <p className="text-xs text-zinc-500 mt-1">Complete the CAPTCHA, then paste the badge into your email.</p>
              </div>

              {generateError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                  {generateError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500">Sender *</label>
                  <select
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
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
                  <label className="text-xs text-zinc-500">Recipient Email (optional)</label>
                  <input
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500">Subject Hint (optional)</label>
                  <input
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                    placeholder="e.g. Job application, Invoice #1234"
                    maxLength={100}
                    value={subjectHint}
                    onChange={(e) => setSubjectHint(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500">Email Body (optional — cryptographically binds stamp to this content)</label>
                  <textarea
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 min-h-[80px] resize-y"
                    placeholder="Paste your email body text to bind this stamp to the exact content…"
                    value={emailBodyText}
                    onChange={(e) => setEmailBodyText(e.target.value)}
                  />
                  {emailBodyText && (
                    <p className="text-xs text-zinc-600">Content hash will be included in the Ed25519 signature.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500">Human Verification *</label>
                  {siteKey ? (
                    <Turnstile
                      siteKey={siteKey}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                      options={{ theme: "dark" }}
                    />
                  ) : (
                    <div className="text-xs text-zinc-500 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                      Turnstile not configured — dev mode
                      <button className="ml-2 text-indigo-400 underline" onClick={() => setTurnstileToken("dev-token")}>
                        Use dev token
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={generateStamp}
                    disabled={!selectedSender || (!turnstileToken && !!siteKey) || generating}
                    className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
                  >
                    {generating ? "Generating…" : "Generate Stamp"}
                  </button>
                </div>
              </div>

              {stampResult && (
                <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-indigo-400 bg-indigo-400/10 border-indigo-400/20 px-2 py-0.5 rounded-full text-xs border">✓ Stamp Created</span>
                    <span className="text-xs text-zinc-500">Expires {formatDate(stampResult.expires_at)}</span>
                    {localContentHash && (
                      <span className="text-xs text-zinc-500 font-mono">Content hash: {localContentHash.slice(0, 16)}…</span>
                    )}
                  </div>

                  {[
                    { label: "Stamp URL", value: stampResult.stamp_url, field: "url" },
                    { label: "HTML Badge (paste into email HTML)", value: stampResult.badge_html, field: "html" },
                    { label: "Plain Text Badge", value: stampResult.badge_text, field: "text" },
                  ].map(({ label, value, field }) => (
                    <div key={field} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-500">{label}</label>
                        <button onClick={() => copyToClipboard(value, field)} className="text-xs text-zinc-400 hover:text-white transition-colors">
                          {copiedField === field ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-400 break-all font-mono overflow-x-auto">
                        {value}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">Preview:</span>
                    <a
                      href={stampResult.stamp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", background: "#6366f1", color: "#fff", fontSize: "12px", fontFamily: "system-ui, sans-serif", textDecoration: "none" }}
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
            <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">Loading…</div>
          ) : stamps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
              <span className="text-4xl">✉️</span>
              <p className="text-sm">No stamps yet</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-600">{stampsTotal} total stamps</p>
              {stamps.map((stamp) => (
                <div key={stamp.id} className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-zinc-400">{stamp.id.slice(0, 8)}…</span>
                      {stamp.revoked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-red-400 bg-red-400/10 border-red-400/20">Revoked</span>
                      ) : new Date(stamp.expires_at) < new Date() ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-zinc-400 bg-zinc-400/10 border-zinc-400/20">Expired</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-indigo-400 bg-indigo-400/10 border-indigo-400/20">Valid</span>
                      )}
                      <span className="text-xs text-zinc-600">{stamp.client_type}</span>
                    </div>
                    {stamp.recipient_email && <p className="text-xs text-zinc-500">To: {stamp.recipient_email}</p>}
                    {stamp.subject_hint && <p className="text-xs text-zinc-500">Re: {stamp.subject_hint}</p>}
                    <p className="text-xs text-zinc-600">Created {timeAgo(stamp.created_at)} · Expires {formatDate(stamp.expires_at)}</p>
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
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Sender Profiles</h2>
              <p className="text-xs text-zinc-500 mt-1">Add the email addresses you send from. Each must be verified.</p>
            </div>
            {senderError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{senderError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                placeholder="Display name *"
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
              />
              <input
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
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
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                {addingSender ? "Adding…" : "Add Sender"}
              </button>
            </div>
            {senders.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                {senders.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2 py-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{s.display_name}</span>
                          {s.verified_email ? (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400 border border-indigo-400/20">✓ Verified</span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">Unverified</span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">{s.email} · {s.total_stamps} stamps</span>
                      </div>
                      {!s.verified_email && verifyingCode !== s.id && (
                        <button
                          onClick={() => sendVerificationCode(s.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors"
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
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            value={verificationCodeInput}
                            onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                          <button
                            onClick={() => submitVerificationCode(s.id)}
                            disabled={verificationCodeInput.length !== 6 || verifyingEmail}
                            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
                          >
                            {verifyingEmail ? "…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => { setVerifyingCode(null); setVerificationCode(""); setVerificationCodeInput(""); }}
                            className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 transition-colors"
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

          {/* API Keys */}
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">API Keys</h2>
              <p className="text-xs text-zinc-500 mt-1">For programmatic access. Keys are prefixed with <code className="text-indigo-400">si_live_</code> and shown once.</p>
            </div>
            {keyError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{keyError}</div>
            )}
            {newKeyValue && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-3 flex flex-col gap-2">
                <p className="text-xs text-indigo-400 font-medium">Key created — copy it now, it won&apos;t be shown again</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-white font-mono break-all flex-1">{newKeyValue}</code>
                  <button onClick={() => copyToClipboard(newKeyValue, "new-key")} className="shrink-0 text-xs text-zinc-400 hover:text-white transition-colors">
                    {copiedField === "new-key" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <input
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                placeholder="Key name (e.g. Chrome Extension)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <button
                onClick={addApiKey}
                disabled={!newKeyName.trim() || addingKey}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                {addingKey ? "Creating…" : "Create Key"}
              </button>
            </div>
            {apiKeysLoading ? (
              <div className="text-center text-zinc-600 text-sm py-4">Loading…</div>
            ) : apiKeys.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white">{k.name}</span>
                      <span className="text-xs text-zinc-500 font-mono">{k.key_prefix}… · {k.scopes.join(", ")}</span>
                      <span className="text-xs text-zinc-600">
                        {k.last_used_at ? `Last used ${timeAgo(k.last_used_at)}` : "Never used"} · Created {formatDate(k.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
