/**
 * app/admin/coaching/session/[id]/page.tsx
 *
 * Coach session room inside the admin shell.
 * Accessible to anyone with coaching.manage permission — no member
 * subscription required. Coaches use this; members use the member-side room.
 */

import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SessionRoomClient } from "@/app/(member)/account/coaching/session/[id]/session-room-client";
import { PostSessionWrapper } from "@/app/(member)/account/coaching/session/[id]/post-session-wrapper";

export const metadata = { title: "Session Room — Positives Admin" };

type BookingRow = {
  id: string;
  member_id: string;
  coach_id: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string | null;
  livekit_room_name: string | null;
  zoom_join_url: string | null;
  member_intake: string | null;
  member: { name: string | null; email: string } | null;
  coach: { id: string; member_id: string; display_name: string; avatar_url: string | null } | null;
};

function formatTime(iso: string, tz?: string | null) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: tz ?? "America/New_York", timeZoneName: "short",
  }).format(new Date(iso));
}

export default async function AdminCoachingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = await params;
  const user = await requireAdminPermission("coaching.manage");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: raw } = await supabase
    .from("coaching_booking")
    .select(`id, member_id, coach_id, status, scheduled_at, duration_minutes, timezone,
             livekit_room_name, zoom_join_url, member_intake,
             member:member(name, email),
             coach:coach_profile(id, member_id, display_name, avatar_url)`)
    .eq("id", bookingId)
    .single();

  const booking = raw as BookingRow | null;
  if (!booking) redirect("/admin/coaching");

  const coachProfile = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
  const memberProfile = Array.isArray(booking.member) ? booking.member[0] : booking.member;

  // Only the assigned coach (or a super admin) can enter this room
  const isAssignedCoach = coachProfile?.member_id === user.id;
  const isAdmin = !isAssignedCoach; // admins can observe but not join the room

  const tz = booking.timezone ?? "America/New_York";
  const sessionStart = new Date(booking.scheduled_at).getTime();
  const now = Date.now();
  const minutesUntil = Math.floor((sessionStart - now) / 60000);
  const sessionPast = now > sessionStart + (booking.duration_minutes + 15) * 60000;
  const sessionOpen = minutesUntil <= 30 && !sessionPast;

  const role = isAssignedCoach ? "coach" : "member";

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Session with {memberProfile?.name ?? memberProfile?.email ?? "Member"}
          </h1>
          <p className="admin-page-subtitle">{formatTime(booking.scheduled_at, tz)}</p>
        </div>
        <a href="/admin/coaching" className="admin-btn admin-btn--ghost">
          ← Back to Coaching
        </a>
      </div>

      <div className="flex flex-col gap-5 max-w-3xl">
        {booking.member_intake && (
          <SurfaceCard elevated className="surface-card--editorial">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Pre-session intake
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {booking.member_intake}
            </p>
          </SurfaceCard>
        )}

        {booking.status === "canceled" && (
          <SurfaceCard padding="md" className="border border-destructive/20 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">This session has been canceled.</p>
          </SurfaceCard>
        )}

        {booking.status === "completed" && (
          <SurfaceCard padding="md" className="border border-secondary/20 bg-secondary/5">
            <p className="text-sm font-medium text-foreground">This session is marked complete.</p>
          </SurfaceCard>
        )}

        {booking.status === "confirmed" && (
          <section aria-label="Video session">
            {sessionOpen ? (
              <SessionRoomClient
                bookingId={bookingId}
                scheduledAt={booking.scheduled_at}
                durationMinutes={booking.duration_minutes}
                coachName={coachProfile?.display_name ?? "Coach"}
                memberName={memberProfile?.name ?? null}
                role={role}
              />
            ) : sessionPast ? (
              <PostSessionWrapper
                bookingId={bookingId}
                role={role}
                coachName={coachProfile?.display_name}
                memberName={memberProfile?.name ?? null}
              />
            ) : (
              <SurfaceCard padding="lg" className="border border-border">
                <div className="flex flex-col gap-3">
                  <p className="text-base font-semibold text-foreground">
                    {minutesUntil > 60
                      ? `Session starts in ${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
                      : `Session starts in ${minutesUntil} minutes`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The video room opens 30 minutes before the session. Check back then.
                  </p>
                  {booking.zoom_join_url && (
                    <a
                      href={booking.zoom_join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Or join via Zoom →
                    </a>
                  )}
                </div>
              </SurfaceCard>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
