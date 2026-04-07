"use client";

import { useActionState, useState } from "react";
import type { SavedPrice } from "./page";
import type { PackageType } from "./actions";

/**
 * app/admin/members/[id]/assign-l4/AssignL4Form.tsx
 *
 * Package modes:
 *   Saved packages  — existing Stripe Prices on the L4 product (from a past custom build)
 *   Pay in Full     — $4,500 single invoice (amount adjustable)
 *   3-Pay Plan      — $1,500 × 3 months, auto-cancels after 90 days
 *   Custom Package  — admin builds a new package; creates a Stripe Price for future reuse
 */

type Props = {
  memberId: string;
  threePayPriceId: string;
  savedPrices: SavedPrice[];
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.875rem",
  overflow: "hidden",
};

const CARD_HDR: React.CSSProperties = {
  padding: "0.75rem 1.25rem",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--color-muted-fg)",
};

const CARD_BODY: React.CSSProperties = {
  padding: "1.25rem",
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.75rem",
};

const RADIO_ROW = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "0.875rem",
  padding: "0.875rem 1rem",
  borderRadius: "0.625rem",
  border: `1px solid ${active ? "rgba(47,111,237,0.4)" : "var(--color-border)"}`,
  background: active ? "rgba(47,111,237,0.05)" : "var(--color-muted)",
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
});

const LABEL_MICRO: React.CSSProperties = {
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--color-muted-fg)",
  marginBottom: "0.35rem",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "var(--color-muted)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  color: "var(--color-foreground)",
  outline: "none",
  boxSizing: "border-box" as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatInterval(interval: string, count: number) {
  if (interval === "month" && count === 3) return "/quarter";
  if (interval === "month") return "/month";
  if (interval === "year") return "/year";
  return `/${count} ${interval}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AssignL4Form({ memberId, threePayPriceId, savedPrices, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [mode, setMode] = useState<PackageType | "saved">(savedPrices.length > 0 ? "saved" : "pay_in_full");
  const [savedPriceId, setSavedPriceId] = useState(savedPrices[0]?.id ?? "");
  const [billingType, setBillingType] = useState("monthly");

  // Derive the actual packageType value for the hidden input
  const packageType: PackageType = mode === "saved" ? "saved_price" : mode;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="packageType" value={packageType} />
      {mode === "saved" && <input type="hidden" name="savedPriceId" value={savedPriceId} />}

      {/* Error */}
      {state.error && (
        <div role="alert" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.75rem", padding: "0.875rem 1rem", fontSize: "0.875rem", color: "#dc2626" }}>
          {state.error}
        </div>
      )}

      {/* ── Saved Packages (from Stripe) ─────────────────────────────────── */}
      {savedPrices.length > 0 && (
        <div style={CARD}>
          <div style={CARD_HDR}>Saved Packages</div>
          <div style={CARD_BODY}>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", lineHeight: 1.5, marginBottom: "0.25rem" }}>
              Previously created custom packages — ready to apply with one click.
            </p>
            {savedPrices.map((price) => (
              <label key={price.id} style={RADIO_ROW(mode === "saved" && savedPriceId === price.id)}>
                <input
                  type="radio"
                  name="_modeUI"
                  checked={mode === "saved" && savedPriceId === price.id}
                  onChange={() => { setMode("saved"); setSavedPriceId(price.id); }}
                  style={{ marginTop: "0.2rem", accentColor: "var(--color-primary)", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-foreground)" }}>
                    {price.nickname}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", marginTop: "0.2rem" }}>
                    {formatAmount(price.unitAmount)}{formatInterval(price.interval, price.intervalCount)}
                    {price.cycles ? ` · ${price.cycles} cycles` : " · ongoing"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Standard Packages ────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HDR}>Standard Packages</div>
        <div style={CARD_BODY}>
          {/* Pay in Full */}
          <label style={RADIO_ROW(mode === "pay_in_full")}>
            <input
              type="radio"
              name="_modeUI"
              checked={mode === "pay_in_full"}
              onChange={() => setMode("pay_in_full")}
              style={{ marginTop: "0.2rem", accentColor: "var(--color-primary)", flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-foreground)" }}>Pay in Full — $4,500</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", marginTop: "0.2rem", lineHeight: 1.5 }}>
                Single invoice for the full 90-day package. Amount adjustable below.
              </p>
            </div>
          </label>

          {/* 3-Pay */}
          {threePayPriceId && (
            <label style={RADIO_ROW(mode === "three_pay")}>
              <input
                type="radio"
                name="_modeUI"
                checked={mode === "three_pay"}
                onChange={() => setMode("three_pay")}
                style={{ marginTop: "0.2rem", accentColor: "var(--color-primary)", flexShrink: 0 }}
              />
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-foreground)" }}>3-Pay Plan — $1,500 × 3</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", marginTop: "0.2rem", lineHeight: 1.5 }}>
                  Monthly subscription. Auto-cancels after 3 billing cycles (90 days).
                </p>
              </div>
            </label>
          )}

          {/* Custom */}
          <label style={RADIO_ROW(mode === "custom")}>
            <input
              type="radio"
              name="_modeUI"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
              style={{ marginTop: "0.2rem", accentColor: "var(--color-primary)", flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-foreground)" }}>Custom Package</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", marginTop: "0.2rem", lineHeight: 1.5 }}>
                Define amount, billing frequency, and cycles. Saved to Stripe for future reuse.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* ── Mode-specific inputs ─────────────────────────────────────────── */}

      {mode === "pay_in_full" && (
        <div style={CARD}>
          <div style={CARD_HDR}>Amount</div>
          <div style={CARD_BODY}>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", lineHeight: 1.5 }}>
              Default is $4,500. Adjust only if a different amount was agreed on the call.
            </p>
            <div>
              <p style={LABEL_MICRO}>Amount (USD)</p>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-fg)", fontSize: "0.875rem" }}>$</span>
                <input type="number" name="customAmount" defaultValue="4500" min="100" step="0.01" style={{ ...INPUT, paddingLeft: "1.75rem" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "three_pay" && (
        <div style={{ background: "rgba(47,111,237,0.04)", border: "1px solid rgba(47,111,237,0.18)", borderRadius: "0.75rem", padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--color-foreground)", lineHeight: 1.6 }}>
          $1,500/month for 3 months — $4,500 total. The subscription automatically cancels after the 3rd payment. No manual action needed.
        </div>
      )}

      {mode === "custom" && (
        <div style={CARD}>
          <div style={CARD_HDR}>Custom Package Builder</div>
          <div style={CARD_BODY}>
            <div>
              <p style={LABEL_MICRO}>Package Name <span style={{ color: "var(--color-muted-fg)", fontWeight: 400 }}>(saved to Stripe for future reuse)</span></p>
              <input type="text" name="nickname" placeholder="e.g. Intensive Coaching — 6 months" required style={INPUT} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <p style={LABEL_MICRO}>Amount (USD)</p>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-fg)", fontSize: "0.875rem" }}>$</span>
                  <input type="number" name="customAmount" placeholder="e.g. 2500" min="1" step="0.01" required style={{ ...INPUT, paddingLeft: "1.75rem" }} />
                </div>
              </div>
              <div>
                <p style={LABEL_MICRO}>Billing Frequency</p>
                <select name="billingType" value={billingType} onChange={(e) => setBillingType(e.target.value)} style={INPUT}>
                  <option value="one_time">One-time (invoice)</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (every 3 mo)</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            {billingType !== "one_time" && (
              <div>
                <p style={LABEL_MICRO}>Number of Billing Cycles</p>
                <input type="number" name="cycles" min="1" max="60" placeholder="Leave blank for ongoing" style={INPUT} />
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", marginTop: "0.35rem" }}>
                  If set, the subscription cancels automatically after this many cycles.
                </p>
              </div>
            )}

            {billingType === "one_time" && (
              <div>
                <p style={LABEL_MICRO}>Invoice Description</p>
                <input type="text" name="customDescription" placeholder="Positives Level 4 — Executive Coaching" style={INPUT} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Collection Method ────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HDR}>Payment Collection</div>
        <div style={CARD_BODY}>
          {[
            { value: "invoice", label: "Send invoice (recommended)", desc: "Stripe emails a payment link with a 7-day due date. No saved card required." },
            { value: "auto", label: "Charge automatically", desc: "Charges the member's saved card on file. Member must have a default payment method in Stripe." },
          ].map((opt) => (
            <label key={opt.value} style={{ ...RADIO_ROW(false), cursor: "pointer" }}>
              <input type="radio" name="collectionMethod" value={opt.value} defaultChecked={opt.value === "invoice"} style={{ marginTop: "0.2rem", accentColor: "var(--color-primary)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-foreground)" }}>{opt.label}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", marginTop: "0.25rem", lineHeight: 1.5 }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Internal Note ────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HDR}>Internal Note</div>
        <div style={CARD_BODY}>
          <textarea name="adminNote" rows={3} placeholder="e.g. Assigned after Breakthrough Session on Apr 7. Member agreed to 90-day commitment." style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>Stored in Stripe metadata. Not visible to the member.</p>
        </div>
      </div>

      {/* ── Confirmation ─────────────────────────────────────────────────── */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontSize: "0.875rem", color: "var(--color-foreground)", lineHeight: 1.6, padding: "1rem", background: "var(--color-muted)", borderRadius: "0.75rem", border: "1px solid var(--color-border)" }}>
        <input type="checkbox" required style={{ marginTop: "0.3rem", accentColor: "var(--color-primary)", flexShrink: 0, width: "1rem", height: "1rem" }} />
        I confirm the Breakthrough Session has been completed, the member agreed to the selected package and price, and billing is ready to activate.
      </label>

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <button type="submit" disabled={isPending} style={{ background: isPending ? "var(--color-muted-fg)" : "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)", color: "white", border: "none", borderRadius: "9999px", padding: "0.9375rem 2rem", fontSize: "0.9375rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", boxShadow: isPending ? "none" : "0 4px 16px rgba(47,111,237,0.25)", textAlign: "center" }}>
        {isPending ? "Activating…" : "Activate Level 4 Package"}
      </button>

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--color-muted-fg)", lineHeight: 1.6 }}>
        Creates a live charge or subscription and immediately grants L4 access.
        Manage billing in the{" "}
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>Stripe Dashboard ↗</a>
      </p>
    </form>
  );
}
