/**
 * app/admin/coaching/page.tsx
 *
 * Admin coaching overview — coaches, upcoming bookings, session pack usage.
 */

import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import Link from "next/link";
import { AdminBookingActions } from "./AdminBookingActions";

export const metadata = {
  title: "Coaching — Admin",
};

// ─── Types ────────────────────────────────────────────────────────────────────

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
  coach: { display_name: string } | null;
};

type PackStat = {
  member_id: string;
  sessions_remaining: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(iso)) + " ET";
}

function timeFromNow(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Past";
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getCoachingAdminData() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const now = new Date().toISOString();

  const [{ data: coachesRaw }, { data: upcomingRaw }, { data: recentRaw }, { data: packsRaw }] =
    await Promise.all([
      supabase
        .from("coach_profile")
        .select("id, display_name, title, avatar_url, is_active, session_duration_minutes, buffer_minutes_after, routing_group, accepts_new, member_id")
        .order("is_active", { ascending: false })
        .order("display_name", { ascending: true }),

      supabase
        .from("coaching_booking")
        .select("id, status, scheduled_at, duration_minutes, member_intake, timezone, member:member(email, name), coach:coach_profile(display_name)")
        .eq("status", "confirmed")
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(20),

      supabase
        .from("coaching_booking")
        .select("id, status, scheduled_at, duration_minutes, member_intake, timezone, member:member(email, name), coach:coach_profile(display_name)")
        .in("status", ["completed", "canceled", "noshow"])
        .order("scheduled_at", { ascending: false })
        .limit(10),

      supabase
        .from("coaching_session_pack")
        .select("member_id, sessions_remaining")
        .gt("sessions_remaining", 0),
    ]);

  const coaches = (coachesRaw as CoachRow[] | null) ?? [];
  const upcomingBookings = (upcomingRaw as BookingRow[] | null) ?? [];
  const recentBookings = (recentRaw as BookingRow[] | null) ?? [];
  const packs = (packsRaw as PackStat[] | null) ?? [];

  const membersWithSessions = new Set(packs.map((p) => p.member_id)).size;
  const totalSessionsRemaining = packs.reduce((s, p) => s + p.sessions_remaining, 0);

  return { coaches, upcomingBookings, recentBookings, membersWithSessions, totalSessionsRemaining };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminCoachingPage() {
  await requireAdmin();
  const { coaches, upcomingBookings, recentBookings, membersWithSessions, totalSessionsRemaining } =
    await getCoachingAdminData();

  const activeCoaches = coaches.filter((c) => c.is_active);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Coaching</h1>
          <p className="admin-page-subtitle">
            Coach roster, upcoming sessions, and session pack overview.
          </p>
        </div>
        <Link
          href="/admin/coaching/coaches/new"
          className="admin-btn admin-btn--primary"
        >
          + Add Coach
        </Link>
      </div>

      {/* ── Stat row ──────────────────────────────────────────────────────── */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Active Coaches</p>
          <p className="admin-stat-card__value">{activeCoaches.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Upcoming Sessions</p>
          <p className="admin-stat-card__value">{upcomingBookings.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Members w/ Sessions</p>
          <p className="admin-stat-card__value">{membersWithSessions}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label">Sessions In Reserve</p>
          <p className="admin-stat-card__value">{totalSessionsRemaining}</p>
        </div>
      </div>

      {/* ── Coach roster ──────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2 className="admin-section__title">Coach Roster</h2>
        {coaches.length === 0 ? (
          <div className="admin-empty-state">
            <p>No coaches configured yet.</p>
            <Link href="/admin/coaching/coaches/new" className="admin-btn admin-btn--secondary mt-3">
              Add first coach
            </Link>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Status</th>
                  <th>Group</th>
                  <th>Session</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr key={coach.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {coach.avatar_url ? (
                          <img
                            src={coach.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: "var(--color-primary)" }}
                          >
                            {coach.display_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{coach.display_name}</p>
                          {coach.title && (
                            <p className="text-xs text-muted-foreground">{coach.title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          coach.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            coach.is_active ? "bg-green-500" : "bg-muted-foreground"
                          }`}
                        />
                        {coach.is_active ? "Active" : "Inactive"}
                      </span>
                      {!coach.accepts_new && (
                        <p className="mt-0.5 text-[11px] text-amber-600">Existing only</p>
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground capitalize">
                      {coach.routing_group}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {coach.session_duration_minutes}m + {coach.buffer_minutes_after}m buffer
                    </td>
                    <td>
                      <Link
                        href={`/admin/coaching/coaches/${coach.id}`}
                        className="text-sm text-primary hover:underline"
                      >
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

      {/* ── Upcoming sessions ─────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2 className="admin-section__title">Upcoming Sessions</h2>
        {upcomingBookings.length === 0 ? (
          <div className="admin-empty-state">
            <p>No upcoming sessions scheduled.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Coach</th>
                  <th>Scheduled</th>
                  <th>In</th>
                  <th>Intake</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.map((b) => {
                  const member = Array.isArray(b.member) ? b.member[0] : b.member;
                  const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
                  return (
                    <tr key={b.id}>
                      <td>
                        <p className="font-medium text-foreground text-sm">
                          {member?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{member?.email}</p>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {coach?.display_name ?? "—"}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {formatDateTime(b.scheduled_at)}
                      </td>
                      <td>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {timeFromNow(b.scheduled_at)}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {b.member_intake ?? <span className="text-muted-foreground/50">None</span>}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/account/coaching/session/${b.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Session room ↗
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
        )}
      </section>

      {/* ── Recent completed / canceled ───────────────────────────────────── */}
      {recentBookings.length > 0 && (
        <section className="admin-section">
          <h2 className="admin-section__title">Recent Sessions</h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Coach</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const member = Array.isArray(b.member) ? b.member[0] : b.member;
                  const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
                  return (
                    <tr key={b.id}>
                      <td>
                        <p className="text-sm font-medium text-foreground">
                          {member?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{member?.email}</p>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {coach?.display_name ?? "—"}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {formatDateTime(b.scheduled_at)}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : b.status === "canceled"
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
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
