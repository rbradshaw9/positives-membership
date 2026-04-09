import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getMemberDetail } from "@/lib/queries/get-admin-members";
import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";
import { AssignL4Form } from "./AssignL4Form";
import { assignL4Subscription } from "./actions";

/**
 * app/admin/members/[id]/assign-l4/page.tsx
 *
 * Fetches two things from Stripe at render time (server-side):
 *   1. Active prices on the L4 product — these are the reusable custom presets.
 *   2. The 3-pay price ID (env var) — shown as a standard option.
 *
 * Stripe Prices are the canonical store for custom packages. No DB table needed.
 */

export const metadata = {
  title: "Assign Executive Coaching — Positives Admin",
};

export type SavedPrice = {
  id: string;
  nickname: string;
  unitAmount: number;
  interval: string;
  intervalCount: number;
  cycles: number | null;
};

type PageParams = Promise<{ id: string }>;

export default async function AssignL4Page({ params }: { params: PageParams }) {
  await requireAdmin();

  const { id } = await params;
  const member = await getMemberDetail(id);
  if (!member) notFound();

  const l4ProductId = config.stripe.products.level4;
  const threePayPriceId = config.stripe.prices.level4ThreePay;

  // Load all active recurring prices on the L4 product from Stripe.
  // These are custom packages previously created via this tool.
  // We exclude the standard 3-pay price so it doesn't appear twice.
  let savedPrices: SavedPrice[] = [];
  if (l4ProductId) {
    try {
      const stripe = getStripe();
      const { data } = await stripe.prices.list({
        product: l4ProductId,
        active: true,
        type: "recurring",
        limit: 100,
      });
      savedPrices = data
        .filter((p) => p.nickname && p.id !== threePayPriceId)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname!,
          unitAmount: p.unit_amount ?? 0,
          interval: p.recurring?.interval ?? "month",
          intervalCount: p.recurring?.interval_count ?? 1,
          cycles: p.metadata?.cycles ? parseInt(p.metadata.cycles, 10) : null,
        }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname));
    } catch (err) {
      console.error("[admin/assign-l4] Failed to fetch Stripe prices:", err);
    }
  }

  const stripeUrl = member.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${member.stripe_customer_id}`
    : null;

  const canProceed = !!member.stripe_customer_id;

  return (
    <div style={{ maxWidth: "38rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Back */}
      <Link href={`/admin/members/${id}`} className="admin-back-link">
        ← {member.name ?? member.email}
      </Link>

      {/* Header */}
      <div>
        <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-fg)", marginBottom: "0.375rem" }}>
          Admin action
        </p>
        <h1 className="admin-page-header__title">Assign Executive Coaching</h1>
        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--color-muted-fg)", lineHeight: 1.6 }}>
          Use this during or after a Breakthrough Session call. Creates a Stripe charge
          or subscription and immediately grants Executive Coaching access.
        </p>
      </div>

      {/* Member summary */}
      <div style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.875rem", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--color-border)", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-fg)" }}>
          Member
        </div>
        <div style={{ padding: "1.25rem" }}>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
            {[
              ["Name", member.name ?? "Not set"],
              ["Email", member.email],
              ["Current Tier", member.subscription_tier ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted-fg)", marginBottom: "0.2rem" }}>{label}</dt>
                <dd style={{ fontSize: "0.875rem", color: "var(--color-foreground)" }}>{value}</dd>
              </div>
            ))}
            <div>
              <dt style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted-fg)", marginBottom: "0.2rem" }}>Stripe Customer</dt>
              <dd style={{ fontSize: "0.875rem" }}>
                {stripeUrl ? (
                  <a href={stripeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {member.stripe_customer_id} ↗
                  </a>
                ) : (
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>⚠ No Stripe customer</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Guard */}
      {!canProceed ? (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.75rem", padding: "1rem 1.25rem", fontSize: "0.875rem", color: "#dc2626", lineHeight: 1.6 }}>
          <strong>Cannot assign Executive Coaching.</strong> This member has no Stripe customer ID.
          Have them complete at least a Membership checkout before assigning Executive Coaching.
        </div>
      ) : (
        <AssignL4Form
          memberId={id}
          threePayPriceId={threePayPriceId}
          savedPrices={savedPrices}
          action={assignL4Subscription}
        />
      )}
    </div>
  );
}
