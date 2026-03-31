import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "./account-client";

export const metadata = {
  title: "Account — Positives",
  description: "Manage your Positives account settings.",
};

/**
 * app/(member)/account/page.tsx
 * Account settings page — protected by the member layout guard.
 *
 * Currently shows:
 *   - Email address (read-only)
 *   - Password setup form (for guest-onboarded members with password_set = false)
 *   - "Password already set" confirmation for members who have set one
 *
 * Future: name, notifications, billing portal link (Stripe Customer Portal)
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("member")
    .select("email, name, password_set")
    .eq("id", user!.id)
    .single();

  const email = member?.email ?? user?.email ?? "";
  const passwordSet = member?.password_set === true;

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      {/* ── Page header ──────────────────────────────────────────── */}
      <header className="mb-8">
        <h1
          className="font-heading font-bold"
          style={{ fontSize: "1.6rem", letterSpacing: "-0.04em", color: "#121417" }}
        >
          Account
        </h1>
      </header>

      {/* ── Email (read-only) ─────────────────────────────────────── */}
      <section className="mb-8">
        <h2
          className="text-xs font-semibold uppercase mb-3"
          style={{ color: "#9AA0A8", letterSpacing: "0.1em" }}
        >
          Email address
        </h2>
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: "rgba(18,20,23,0.04)",
            border: "1.5px solid rgba(221,215,207,0.7)",
            color: "#4A5360",
            fontSize: "0.925rem",
            letterSpacing: "-0.01em",
          }}
        >
          {email}
        </div>
      </section>

      {/* ── Password ─────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase mb-3"
          style={{ color: "#9AA0A8", letterSpacing: "0.1em" }}
        >
          {passwordSet ? "Password" : "Set a password"}
        </h2>

        {passwordSet ? (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "rgba(78,140,120,0.06)",
              border: "1.5px solid rgba(78,140,120,0.15)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E8C78"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm" style={{ color: "#4E8C78", fontWeight: 500 }}>
              Password is set
            </span>
          </div>
        ) : (
          <>
            <p
              className="text-sm mb-5"
              style={{ color: "#68707A", lineHeight: "1.65", letterSpacing: "-0.01em" }}
            >
              You signed up via a magic link. Add a password so you can sign in
              with email and password anytime.
            </p>
            <AccountClient />
          </>
        )}
      </section>
    </div>
  );
}
