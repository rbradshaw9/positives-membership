import Link from "next/link";
import Image from "next/image";
import { SuccessClient } from "./success-client";

export const metadata = {
  title: "Setting Up — Positives",
  description: "Your Positives membership is being activated.",
};

/**
 * app/subscribe/success/page.tsx
 * Server-rendered shell for the post-checkout success flow.
 *
 * Reads session_id from search params and passes it to the SuccessClient
 * component which handles:
 *   - polling /api/auth/exchange for the one-time login token
 *   - calling supabase.auth.verifyOtp() to establish a session
 *   - redirecting to /today on success
 *   - showing a graceful fallback after 30s
 *
 * This page intentionally shows NO static checkout confirmation content.
 * For guests (new payment-first path), the SuccessClient handles the full UX.
 * For existing auth-first users (who will be logged in already), the server
 * access guard on /today handles enforcement — they can navigate directly.
 */
export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#FAFAF8" }}>

      {/* ── Minimal nav ──────────────────────────────────────────────────── */}
      <header
        className="w-full"
        style={{
          background: "rgba(250,250,248,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.55)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-center">
          <Link href="/">
            <Image
              src="/logos/positives-wordmark-dark.png"
              alt="Positives"
              width={120}
              height={26}
              style={{ height: 26, width: "auto" }}
              priority
            />
          </Link>
        </div>
      </header>

      {/* ── Main: centred client-controlled content ───────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full"
          style={{
            paddingTop: "clamp(4rem, 8vw, 6rem)",
            paddingBottom: "clamp(4rem, 8vw, 6rem)",
          }}
        >
          <SuccessClient sessionId={session_id ?? null} />
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="w-full"
        style={{ borderTop: "1px solid rgba(221,215,207,0.55)", background: "#FAFAF8" }}
      >
        <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-xs" style={{ color: "#9AA0A8" }}>Privacy</Link>
            <Link href="/terms" className="text-xs" style={{ color: "#9AA0A8" }}>Terms</Link>
          </div>
          <span className="text-xs" style={{ color: "#C4BDB5" }}>
            © {new Date().getFullYear()} Positives
          </span>
        </div>
      </footer>
    </div>
  );
}
