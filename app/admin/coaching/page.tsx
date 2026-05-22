/**
 * app/admin/coaching/page.tsx
 *
 * Two modes:
 *  - Coach view (no members.read): shows only their own sessions as cards.
 *    Clean, action-oriented. Intake notes fully visible.
 *  - Admin view (members.read): full roster, stats, all bookings, grant sessions.
 */

import { requireAdminPermission, getAdminPermissionSet, isBootstrapAdminEmail } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import Link from "next/link";
import { SafeImage } from "@/components/media/SafeImage";
import { AdminBookingActions } from "./AdminBookingActions";
import { GrantSessionsForm } from "./GrantSessionsForm";

export const metadata = { title: "Coaching — Admin" };

// ─── Types ─────────────────────────────────────────────────────────────────────

type CoachRow = {
  id: string;
  display_name: string;
  title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  session_duration_minutes: number;
  buffer_minutes_after: number;
  routing_group: string;
  accepts_new: boolean;
  member_id: string | null;
};

type BookingRow = {
  id: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  member_intake: string | null;
  timezone: string;
  member: { email: string; name: string | null } | null;
  coach: { display_name: string; member_id: string | null } | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: tz ?? "America/New_York",
  }).format(new Date(iso));
}

function formatFullDate(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: tz ?? "America/New_York", timeZoneName: "short",
  }).format(new Date(iso));
}

function timeFromNow(iso: string): { label: string; urgency: "far" | "near" | "soon" | "now" } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { label: "Past", urgency: "far" };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (diff <= 30 * 60 * 1000) return { label: `${m}m`, urgency: "now" };
  if (diff <= 3600000) return { label: `${m}m`, urgency: "soon" };
  if (h < 24) return { label: `${h}h ${m}m`, urgency: "near" };
  const d = Math.floor(h / 24);
  return { label: d === 1 ? "Tomorrow" : `${d} days`, urgency: "far" };
}

function isJoinable(iso: string, durationMinutes: number) {
  const start = new Date(iso).getTime();
  const now = Date.now();
  return now >= start - 30 * 60 * 1000 && now <= start + (durationMinutes + 15) * 60 * 1000;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

async function getCoachingData(coachMemberId?: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const now = new Date().toISOString();

  const [{ data: coachesRaw }, { data: upcomingRaw }, { data: recentRaw }, { data: packsRaw }, { data: myProfileRaw }] =
    await Promise.all([
      supabase
        .from("coach_profile")
        .select("id, display_name, title, avatar_url, is_active, session_duration_minutes, buffer_minutes_after, routing_group, accepts_new, member_id")
        .order("is_active", { ascending: false })
        .order("display_name", { ascending: true }),

      supabase
        .from("coaching_booking")
        .select("id, status, scheduled_at, duration_minutes, member_intake, timezone, member:member(email, name), coach:coach_profile(display_name, member_id)")
        .eq("status", "confirmed")
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(50),

      supabase
        .from("coaching_booking")
        .select("id, status, scheduled_at, duration_minutes, member_intake, timezone, member:member(email, name), coach:coach_profile(display_name, member_id)")
        .in("status", ["completed", "canceled", "noshow"])
        .order("scheduled_at", { ascending: false })
        .limit(10),

      supabase
        .from("coaching_session_pack")
        .select("member_id, sessions_remaining")
        .gt("sessions_remaining", 0),

      // Find this user's coach profile (if they're a coach)
      coachMemberId
        ? supabase.from("coach_profile").select("id, display_name").eq("member_id", coachMemberId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const coaches = (coachesRaw as CoachRow[] | null) ?? [];
  const allUpcoming = (upcomingRaw as BookingRow[] | null) ?? [];
  const recentBookings = (recentRaw as BookingRow[] | null) ?? [];
  const packs = (packsRaw as { member_id: string; sessions_remaining: number }[] | null) ?? [];
  const myProfile = myProfileRaw as { id: string; display_name: string } | null;

  // For coaches: filter to their own sessions
  const myUpcoming = coachMemberId
    ? allUpcoming.filter(b => {
        const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
        return coach?.member_id === coachMemberId;
      })
    : allUpcoming;

  const myRecent = coachMemberId
    ? recentBookings.filter(b => {
        const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
        return coach?.member_id === coachMemberId;
      })
    : recentBookings;

  return {
    coaches,
    allUpcoming,
    myUpcoming,
    myRecent,
    myProfile,
    membersWithSessions: new Set(packs.map(p => p.member_id)).size,
    totalSessionsRemaining: packs.reduce((s, p) => s + p.sessions_remaining, 0),
  };
}

// ─── Session Card (coach view) ─────────────────────────────────────────────────

function SessionCard({ booking }: { booking: BookingRow }) {
  const member = Array.isArray(booking.member) ? booking.member[0] : booking.member;
  const { label, urgency } = timeFromNow(booking.scheduled_at);
  const joinable = isJoinable(booking.scheduled_at, booking.duration_minutes);
  const tz = booking.timezone ?? "America/New_York";
  const initials = (member?.name ?? member?.email ?? "?").charAt(0).toUpperCase();

  const urgencyStyles = {
    now:  "bg-green-100 text-green-700 ring-1 ring-green-500/30",
    soon: "bg-amber-100 text-amber-700",
    near: "bg-primary/10 text-primary",
    far:  "bg-muted text-muted-foreground",
  }[urgency];

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-shadow ${
        joinable
          ? "border-green-500/30 bg-green-50/30 shadow-[0_4px_20px_rgba(34,197,94,0.08)]"
          : "border-border bg-card"
      }`}
      style={{ boxShadow: joinable ? undefined : "0 2px 12px rgba(18,20,23,0.04)" }}
    >
      {/* Header: member + time */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #2EC4B6, #44A8D8)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {member?.name ?? member?.email ?? "Unknown"}
            </p>
            {member?.name && (
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyStyles}`}>
          {urgency === "now" && joinable ? "Now" : label}
        </span>
      </div>

      {/* Date & time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{formatFullDate(booking.scheduled_at, tz)}</span>
      </div>

      {/* Intake notes */}
      {booking.member_intake ? (
        <div className="rounded-xl border border-border/60 bg-surface-tint/30 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Pre-session notes
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {booking.member_intake}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">No pre-session notes</p>
      )}

      {/* Primary action */}
      <div className="mt-auto pt-1">
        {joinable ? (
          <Link
            href={`/admin/coaching/session/${booking.id}`}
            className="block w-full text-center rounded-full py-3 text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              boxShadow: "0 4px 14px rgba(34,197,94,0.30)",
            }}
          >
            Join session →
          </Link>
        ) : (
          <Link
            href={`/admin/coaching/session/${booking.id}`}
            className="block w-full text-center rounded-full py-3 text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/5 transition-colors"
          >
            View session →
          </Link>
        )}
      </div>

      {/* Secondary admin actions */}
      <div className="border-t border-border/50 pt-3 mt-1">
        <AdminBookingActions bookingId={booking.id} currentStatus={booking.status} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminCoachingPage() {
  const user = await requireAdminPermission("coaching.manage");
  const permissionSet = await getAdminPermissionSet(user.id, user.email);
  const canReadMembers = permissionSet.has("members.read") || isBootstrapAdminEmail(user.email);

  const {
    coaches, allUpcoming, myUpcoming, myRecent, myProfile,
    membersWithSessions, totalSessionsRemaining,
  } = await getCoachingData(canReadMembers ? undefined : user.id);

  const isCoachOnly = !canReadMembers;

  // ── Coach-only view ─────────────────────────────────────────────────────────
  if (isCoachOnly) {
    const now = new Date().getTime();
    const todaySessions = myUpcoming.filter(b => {
      const diff = new Date(b.scheduled_at).getTime() - now;
      return diff <= 24 * 3600 * 1000;
    });
    const futureSessions = myUpcoming.filter(b => {
      const diff = new Date(b.scheduled_at).getTime() - now;
      return diff > 24 * 3600 * 1000;
    });

    return (
      <div className="admin-page-content">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-header__title">
              {myProfile ? `${myProfile.display_name}'s Sessions` : "My Sessions"}
            </h1>
            <p className="admin-page-header__subtitle">
              {myUpcoming.length === 0
                ? "No upcoming sessions scheduled."
                : `${myUpcoming.length} upcoming session${myUpcoming.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {myUpcoming.length === 0 ? (
          <div className="admin-empty-state">
            <p className="text-muted-foreground">No upcoming sessions. Check back later.</p>
          </div>
        ) : (
          <>
            {todaySessions.length > 0 && (
              <section className="admin-section">
                <div className="admin-section__header">
                  <h2 className="admin-section__title">Today &amp; Next 24h</h2>
                </div>
                <div className={`p-5 grid gap-4 ${todaySessions.length === 1 ? "max-w-lg" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
                  {todaySessions.map(b => <SessionCard key={b.id} booking={b} />)}
                </div>
              </section>
            )}
            {futureSessions.length > 0 && (
              <section className="admin-section">
                <div className="admin-section__header">
                  <h2 className="admin-section__title">Upcoming</h2>
                </div>
                <div className={`p-5 grid gap-4 ${futureSessions.length === 1 ? "max-w-lg" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
                  {futureSessions.map(b => <SessionCard key={b.id} booking={b} />)}
                </div>
              </section>
            )}
          </>
        )}

        {myRecent.length > 0 && (
          <section className="admin-section">
            <div className="admin-section__header">
              <h2 className="admin-section__title">Recent Sessions</h2>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myRecent.map(b => {
                    const member = Array.isArray(b.member) ? b.member[0] : b.member;
                    return (
                      <tr key={b.id}>
                        <td>
                          <p className="text-sm font-medium text-foreground">{member?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{member?.email}</p>
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {formatDate(b.scheduled_at, b.timezone)}
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.status === "completed" ? "bg-green-100 text-green-700"
                            : b.status === "canceled" ? "bg-muted text-muted-foreground"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    );
  }

  // ── Admin view ──────────────────────────────────────────────────────────────
  const activeCoaches = coaches.filter(c => c.is_active);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Coaching</h1>
          <p className="admin-page-header__subtitle">Coach roster, upcoming sessions, and session packs.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <GrantSessionsForm />
          <Link href="/admin/coaching/coaches/new" className="admin-btn admin-btn--primary">
            + Add Coach
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-ribbon">
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Active Coaches</p>
          <p className="admin-stat-card__value">{activeCoaches.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Upcoming Sessions</p>
          <p className="admin-stat-card__value">{allUpcoming.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Members w/ Packs</p>
          <p className="admin-stat-card__value">{membersWithSessions}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Sessions in Reserve</p>
          <p className="admin-stat-card__value">{totalSessionsRemaining}</p>
        </div>
      </div>

      {/* Upcoming sessions — cards for joinable ones, table for the rest */}
      <section className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">Upcoming Sessions</h2>
        </div>
        {allUpcoming.length === 0 ? (
          <div className="admin-empty-state"><p>No upcoming sessions.</p></div>
        ) : (
          <>
            {/* Joinable sessions as cards */}
            {(() => {
              const joinable = allUpcoming.filter(b => isJoinable(b.scheduled_at, b.duration_minutes));
              if (joinable.length === 0) return null;
              return (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Live now / joining soon
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {joinable.map(b => <SessionCard key={b.id} booking={b} />)}
                  </div>
                </div>
              );
            })()}

            {/* All upcoming as table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Coach</th>
                    <th>Scheduled</th>
                    <th>In</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUpcoming.map(b => {
                    const member = Array.isArray(b.member) ? b.member[0] : b.member;
                    const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
                    const { label, urgency } = timeFromNow(b.scheduled_at);
                    const joinable = isJoinable(b.scheduled_at, b.duration_minutes);
                    return (
                      <tr key={b.id}>
                        <td>
                          <p className="font-medium text-foreground text-sm">{member?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{member?.email}</p>
                        </td>
                        <td className="text-sm text-muted-foreground">{coach?.display_name ?? "—"}</td>
                        <td className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(b.scheduled_at, b.timezone)}
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            joinable ? "bg-green-100 text-green-700"
                            : urgency === "soon" ? "bg-amber-100 text-amber-700"
                            : "bg-primary/10 text-primary"
                          }`}>
                            {joinable ? "Live" : label}
                          </span>
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {b.member_intake ? (
                            <span title={b.member_intake} className="cursor-help">
                              {b.member_intake.length > 60
                                ? b.member_intake.slice(0, 60) + "…"
                                : b.member_intake}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/admin/coaching/session/${b.id}`}
                              className="text-xs text-primary hover:underline whitespace-nowrap"
                            >
                              {joinable ? "Join ↗" : "View ↗"}
                            </Link>
                            <AdminBookingActions bookingId={b.id} currentStatus={b.status} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Coach roster */}
      <section className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">Coach Roster</h2>
        </div>
        {coaches.length === 0 ? (
          <div className="admin-empty-state">
            <p>No coaches configured yet.</p>
            <Link href="/admin/coaching/coaches/new" className="admin-btn admin-btn--outline mt-3">
              Add first coach
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Status</th>
                  <th>Group</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coaches.map(coach => (
                  <tr key={coach.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {coach.avatar_url ? (
                          <SafeImage src={coach.avatar_url} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--color-primary)" }}>
                            {coach.display_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground text-sm">{coach.display_name}</p>
                          {coach.title && <p className="text-xs text-muted-foreground">{coach.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${coach.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${coach.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                        {coach.is_active ? "Active" : "Inactive"}
                      </span>
                      {!coach.accepts_new && <p className="mt-0.5 text-[11px] text-amber-600">Existing only</p>}
                    </td>
                    <td className="text-sm text-muted-foreground capitalize">{coach.routing_group}</td>
                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                      {coach.session_duration_minutes}m + {coach.buffer_minutes_after}m buffer
                    </td>
                    <td>
                      <Link href={`/admin/coaching/coaches/${coach.id}`} className="text-sm text-primary hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent */}
      {myRecent.length > 0 && (
        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">Recent Sessions</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Member</th><th>Coach</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {myRecent.map(b => {
                  const member = Array.isArray(b.member) ? b.member[0] : b.member;
                  const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
                  return (
                    <tr key={b.id}>
                      <td>
                        <p className="text-sm font-medium text-foreground">{member?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{member?.email}</p>
                      </td>
                      <td className="text-sm text-muted-foreground">{coach?.display_name ?? "—"}</td>
                      <td className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(b.scheduled_at, b.timezone)}
                      </td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.status === "completed" ? "bg-green-100 text-green-700"
                          : b.status === "canceled" ? "bg-muted text-muted-foreground"
                          : "bg-amber-100 text-amber-700"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
