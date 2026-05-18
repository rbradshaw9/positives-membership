import { requireMember } from "@/lib/auth/require-member";
import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { CoachingPurchaseButtons } from "./coaching-purchase-buttons";
import { BookingFlow } from "@/components/coaching/BookingFlow";

export const metadata = {
  title: "Coaching Sessions — Positives",
  description:
    "Manage your personal coaching sessions with Dr. Paul Jenkins. View your session balance, session history, and book new sessions.",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PackRow = {
  id: string;
  pack_type: string;
  sessions_total: number;
  sessions_remaining: number;
  granted_by: string | null;
  expires_at: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  event_type_name: string | null;
  invitee_name: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function packLabel(packType: string) {
  if (packType === "single") return "Single Session";
  if (packType === "punch_pass") return "10-Session Punch Pass";
  if (packType === "earned") return "Earned Session";
  if (packType === "bonus") return "Bonus Session";
  return packType;
}

function statusDot(status: string) {
  if (status === "scheduled") return "bg-primary";
  if (status === "completed") return "bg-secondary";
  if (status === "canceled") return "bg-muted-foreground/40";
  return "bg-accent";
}

function statusLabel(status: string) {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  if (status === "canceled") return "Canceled";
  if (status === "unmatched") return "Unmatched";
  return status;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getCoachingData(memberId: string) {
  const supabase = asLooseSupabaseClient(await createClient());

  const [{ data: rawPacks }, { data: rawLogs }] = await Promise.all([
    supabase
      .from("coaching_session_pack")
      .select(
        "id, pack_type, sessions_total, sessions_remaining, granted_by, expires_at, created_at"
      )
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }),
    supabase
      .from("coaching_session_log")
      .select("id, status, scheduled_at, event_type_name, invitee_name, created_at")
      .eq("member_id", memberId)
      .order("scheduled_at", { ascending: false })
      .limit(20),
  ]);

  const packs = (rawPacks as PackRow[] | null) ?? [];
  const logs = (rawLogs as LogRow[] | null) ?? [];

  // Sum up all sessions remaining across non-expired active packs
  const now = new Date();
  const activePacks = packs.filter(
    (p) =>
      p.sessions_remaining > 0 &&
      (!p.expires_at || new Date(p.expires_at) > now)
  );
  const totalRemaining = activePacks.reduce((sum, p) => sum + p.sessions_remaining, 0);

  return { packs, logs, totalRemaining, activePacks };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccountCoachingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [member, resolvedSearchParams] = await Promise.all([
    requireMember(),
    searchParams,
  ]);

  const { packs, logs, totalRemaining, activePacks } = await getCoachingData(member.id);

  const purchaseStatus = resolvedSearchParams.purchase as string | undefined;
  const purchasedPack = resolvedSearchParams.pack as string | undefined;
  const hasPacks = packs.length > 0;
  const hasSessions = totalRemaining > 0;

  return (
    <div>
      <PageHeader
        title="Coaching Sessions"
        subtitle="Work directly with Dr. Paul Jenkins. Track your session balance and book when you're ready."
        hero
        right={
          hasSessions ? (
            <div className="hidden md:block">
              <BookingFlow />
            </div>
          ) : undefined
        }
      />

      <div className="member-container py-8 md:py-10 flex flex-col gap-8">
        {/* ── Purchase success banner ─────────────────────────────────────── */}
        {purchaseStatus === "success" && (
          <SurfaceCard
            padding="md"
            className="border border-primary/20 bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {purchasedPack === "punch_pass"
                    ? "Your 10-Session Punch Pass is ready."
                    : "Your coaching session is ready."}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Book your first session anytime using the button below.
                </p>
              </div>
            </div>
          </SurfaceCard>
        )}

        {purchaseStatus === "canceled" && (
          <SurfaceCard
            padding="md"
            className="border border-border"
          >
            <p className="text-sm text-muted-foreground">
              Your checkout was canceled — nothing was charged. You can purchase sessions anytime below.
            </p>
          </SurfaceCard>
        )}

        {/* ── Session balance hero ───────────────────────────────────────── */}
        <SurfaceCard tone="dark" padding="lg">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ui-section-eyebrow mb-3 text-white/72">Session Balance</p>
              <div className="flex items-end gap-3">
                <span className="font-heading text-5xl font-bold tracking-[-0.04em] text-white">
                  {totalRemaining}
                </span>
                <span className="mb-1.5 text-lg font-medium text-white/60">
                  {totalRemaining === 1 ? "session" : "sessions"} remaining
                </span>
              </div>
              {activePacks.length > 1 && (
                <p className="mt-2 text-sm text-white/60">
                  Across {activePacks.length} active packs
                </p>
              )}
              {activePacks.length === 1 && activePacks[0].expires_at && (
                <p className="mt-2 text-sm text-white/60">
                  Expires {formatDate(activePacks[0].expires_at)}
                </p>
              )}
            </div>

            {hasSessions ? (
              <div className="flex flex-col items-start gap-3">
                <BookingFlow />
                <p className="text-xs text-white/50">
                  A session is deducted automatically when you book.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/60 max-w-xs">
                  Purchase a session or a Punch Pass to get started with personal coaching.
                </p>
              </div>
            )}
          </div>
        </SurfaceCard>

        {/* ── Purchase section ───────────────────────────────────────────── */}
        <section aria-labelledby="section-purchase">
          <SectionLabel id="section-purchase">Add Sessions</SectionLabel>
          <CoachingPurchaseButtons />
        </section>

        {/* ── Active packs ───────────────────────────────────────────────── */}
        {hasPacks && (
          <section aria-labelledby="section-packs">
            <SectionLabel id="section-packs">Your Session Packs</SectionLabel>
            <SurfaceCard elevated className="surface-card--editorial">
              <p className="member-detail-kicker">Pack inventory</p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
                All session packs
              </h2>
              <p className="mt-2 text-sm leading-body text-muted-foreground">
                Sessions from your oldest soonest-to-expire pack are used first.
              </p>

              <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border">
                {packs.map((pack) => {
                  const isActive =
                    pack.sessions_remaining > 0 &&
                    (!pack.expires_at || new Date(pack.expires_at) > new Date());
                  return (
                    <div
                      key={pack.id}
                      className="grid gap-3 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {packLabel(pack.pack_type)}
                          </span>
                          {pack.granted_by === "admin" && (
                            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                              Gifted
                            </span>
                          )}
                          {!isActive && (
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Depleted
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {pack.sessions_remaining} of {pack.sessions_total}{" "}
                          {pack.sessions_total === 1 ? "session" : "sessions"} remaining
                          {pack.expires_at
                            ? ` · Expires ${formatDate(pack.expires_at)}`
                            : ""}
                          {" · "}Purchased {formatDate(pack.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                          style={{
                            background: isActive
                              ? "var(--color-primary)"
                              : "var(--color-muted)",
                            color: isActive ? "#fff" : "var(--color-muted-fg)",
                          }}
                        >
                          {pack.sessions_remaining}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          </section>
        )}

        {/* ── Session history ────────────────────────────────────────────── */}
        <section aria-labelledby="section-history">
          <SectionLabel id="section-history">Session History</SectionLabel>
          <SurfaceCard elevated className="surface-card--editorial">
            <p className="member-detail-kicker">Your sessions</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
              Recent sessions
            </h2>
            <p className="mt-2 text-sm leading-body text-muted-foreground">
              Your upcoming and past coaching sessions appear here.
            </p>

            {logs.length > 0 ? (
              <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="grid gap-3 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${statusDot(log.status)}`}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-foreground">
                          {log.event_type_name ?? "Coaching Session"}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {log.scheduled_at
                          ? formatDateTime(log.scheduled_at)
                          : formatDate(log.created_at)}{" "}
                        · {statusLabel(log.status)}
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium capitalize"
                      style={{
                        color:
                          log.status === "completed"
                            ? "var(--color-secondary)"
                            : log.status === "scheduled"
                              ? "var(--color-primary)"
                              : "var(--color-muted-fg)",
                      }}
                    >
                      {statusLabel(log.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-border bg-surface-tint/40 p-5">
                <p className="text-sm leading-body text-muted-foreground">
                  No sessions yet. Book your first session using the button above.
                </p>
              </div>
            )}
          </SurfaceCard>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section aria-labelledby="section-how">
          <SectionLabel id="section-how">How It Works</SectionLabel>
          <SurfaceCard elevated className="surface-card--editorial">
            <ol className="flex flex-col gap-5">
              {[
                {
                  step: "1",
                  title: "Purchase a session or Punch Pass",
                  body: "A Single Session is ideal if you want to try coaching first. The 10-Session Punch Pass offers the best value and never expires.",
                },
                {
                  step: "2",
                  title: "Pick a time that works for you",
                  body: "Choose from available slots across our coaching team. Sessions are deducted from your balance automatically when you book.",
                },
                {
                  step: "3",
                  title: "Join right here on Positives",
                  body: "At session time, click \"Join Session\" from your coaching dashboard. The video call opens in-platform — no app download needed.",
                },
                {
                  step: "4",
                  title: "Earn free sessions",
                  body: "Refer a new Positives Plus member and you'll receive a bonus session credit — check your affiliate dashboard to see your referrals.",
                },
              ].map(({ step, title, body }) => (
                <li key={step} className="flex gap-4">
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--color-primary)" }}
                    aria-hidden="true"
                  >
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-sm leading-body text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}
