/**
 * app/(member)/account/coaching/session/[id]/page.tsx
 *
 * In-platform coaching session room.
 * Accessible by: the booking's member OR the assigned coach.
 * Loads booking details server-side, renders Livekit video client-side.
 */

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SessionRoomClient } from "./session-room-client";
import { PostSessionWrapper } from "./post-session-wrapper";

export const metadata = {
  title: "Coaching Session — Positives",
};

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
  coach: {
    id: string;
    member_id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

function formatSessionTime(iso: string, timezone?: string | null) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone ?? "America/New_York",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export default async function CoachingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = await params;
  const member = await requireMember();
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: bookingRaw } = await supabase
    .from("coaching_booking")
    .select(
      `id, member_id, coach_id, status, scheduled_at, duration_minutes, timezone,
       livekit_room_name, zoom_join_url, member_intake,
       member:member(name, email),
       coach:coach_profile(id, member_id, display_name, avatar_url)`
    )
    .eq("id", bookingId)
    .single();
  const booking = bookingRaw as BookingRow | null;

  if (!booking) redirect("/account/coaching");

  const coachProfile = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
  const memberProfile = Array.isArray(booking.member) ? booking.member[0] : booking.member;

  // Access check: only the member or the assigned coach can view this
  const isMember = booking.member_id === member.id;
  const isCoach = coachProfile?.member_id === member.id;
  if (!isMember && !isCoach) redirect("/account/coaching");

  const role = isCoach ? "coach" : "member";
  const tz = booking.timezone ?? "America/New_York";
  const sessionTime = new Date(booking.scheduled_at);
  const now = new Date();
  const minutesUntil = Math.floor((sessionTime.getTime() - now.getTime()) / 60000);
  const sessionPast = now > new Date(sessionTime.getTime() + booking.duration_minutes * 60000 + 15 * 60 * 1000);
  const sessionOpen = minutesUntil <= 30 && !sessionPast;

  const statusLabel: Record<string, string> = {
    confirmed: "Confirmed",
    completed: "Completed",
    canceled: "Canceled",
    noshow: "No Show",
    pending: "Pending",
  };

  const formattedSessionTime = formatSessionTime(booking.scheduled_at, tz);

  return (
    <div>
      <PageHeader
        title={
          role === "coach"
            ? `Session with ${memberProfile?.name ?? "Member"}`
            : `Session with ${coachProfile?.display_name ?? "your coach"}`
        }
        subtitle={formattedSessionTime}
        hero
      />

      <div className="member-container flex flex-col gap-6 py-8 pb-28 md:py-10">
        {/* ── Status banner ─────────────────────────────────────────────── */}
        {booking.status === "canceled" && (
          <SurfaceCard padding="md" className="border border-border">
            <p className="text-sm text-muted-foreground">
              This session has been canceled.
            </p>
          </SurfaceCard>
        )}

        {booking.status === "completed" && (
          <SurfaceCard padding="md" className="border border-primary/20 bg-primary/5">
            <p className="text-sm font-medium text-foreground">
              This session is complete.
            </p>
          </SurfaceCard>
        )}

        {/* ── Session details ────────────────────────────────────────────── */}
        <SurfaceCard elevated className="surface-card--editorial">
          <p className="member-detail-kicker">Session details</p>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="mt-1 font-medium text-foreground">
                  {formattedSessionTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="mt-1 font-medium text-foreground">
                  {booking.duration_minutes} minutes
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 font-medium text-foreground">
                  {statusLabel[booking.status] ?? booking.status}
                </p>
              </div>
              {!isCoach && coachProfile && (
                <div>
                  <p className="text-xs text-muted-foreground">Coach</p>
                  <p className="mt-1 font-medium text-foreground">
                    {coachProfile.display_name}
                  </p>
                </div>
              )}
            </div>

            {booking.member_intake && (
              <div className="mt-2 rounded-xl border border-border bg-surface-tint/40 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Pre-session notes
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {booking.member_intake}
                </p>
              </div>
            )}
          </div>
        </SurfaceCard>

        {/* ── Video room ─────────────────────────────────────────────────── */}
        {booking.status === "confirmed" && (
          <section aria-label="Video session">
            {sessionOpen ? (
              <SessionRoomClient
                bookingId={bookingId}
                scheduledAt={booking.scheduled_at}
                durationMinutes={booking.duration_minutes}
                coachName={coachProfile?.display_name ?? "Your coach"}
                memberName={memberProfile?.name ?? null}
                role={role}
              />
            ) : sessionPast ? (
              // Session time has passed — wrap PostSessionPanel in a client
              // component so onComplete can call router.refresh()
              <PostSessionWrapper
                bookingId={bookingId}
                role={role}
                coachName={coachProfile?.display_name}
                memberName={memberProfile?.name ?? null}
              />
            ) : (
              <SurfaceCard padding="md" className="border border-border">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {minutesUntil <= 0
                      ? "Session is in progress"
                      : minutesUntil > 60
                      ? `Session starts in ${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
                      : `Session starts in ${minutesUntil} minutes`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The video room opens 30 minutes before the session begins. Come
                    back then to join.
                  </p>
                  {booking.zoom_join_url && (
                    <a
                      href={booking.zoom_join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Or join via Zoom instead →
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
