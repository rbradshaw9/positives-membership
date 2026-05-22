"use client";

/**
 * app/admin/coaching/GrantSessionsForm.tsx
 *
 * Admin-only form: grant session credits to a member by email.
 */

import { useState } from "react";

export function GrantSessionsForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sessions, setSessions] = useState("1");
  const [packType, setPackType] = useState("bonus");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string | null; email: string; sessions: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/coaching/grant-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberEmail: email.trim(),
          sessions: parseInt(sessions, 10),
          packType,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed");
        setLoading(false);
        return;
      }
      setResult({ name: data.member.name, email: data.member.email, sessions: data.sessions });
      setEmail("");
      setSessions("1");
      setExpiresAt("");
      setLoading(false);
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="admin-btn admin-btn--outline"
      >
        Grant Sessions
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Grant Session Credits</p>
        <button
          onClick={() => { setOpen(false); setResult(null); setError(null); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      {result ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium text-foreground">
            ✓ Granted {result.sessions} session{result.sessions !== 1 ? "s" : ""} to {result.name ?? result.email}
          </p>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Grant more
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="grant-email">
              Member email
            </label>
            <input
              id="grant-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="grant-sessions">
                Sessions
              </label>
              <input
                id="grant-sessions"
                type="number"
                required
                min="1"
                max="100"
                value={sessions}
                onChange={(e) => setSessions(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="grant-type">
                Type
              </label>
              <select
                id="grant-type"
                value={packType}
                onChange={(e) => setPackType(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="bonus">Bonus</option>
                <option value="earned">Earned</option>
                <option value="single">Single</option>
                <option value="punch_pass">Punch Pass</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="grant-expires">
              Expires (optional)
            </label>
            <input
              id="grant-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="admin-btn admin-btn--primary"
            >
              {loading ? "Granting…" : "Grant sessions"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="admin-btn admin-btn--outline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
