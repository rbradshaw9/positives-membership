/**
 * app/(member)/account/coaching/availability/page.tsx
 *
 * Coach-only page: manage weekly availability schedule.
 * Only accessible to members who have an active coach_profile.
 */

import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { AvailabilityEditor } from "./AvailabilityEditor";

export const metadata = {
  title: "Manage Availability — Positives",
};

type CoachProfile = {
  id: string;
  display_name: string;
  session_duration_minutes: number;
  buffer_minutes_after: number;
  blocked_dates: string[] | null;
};

type AvailabilityWindow = {
  id: string;
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
  timezone: string;
  is_active: boolean;
};

async function getCoachData(memberId: string): Promise<{
  coach: CoachProfile | null;
  windows: AvailabilityWindow[];
}> {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: coachRaw } = await supabase
    .from("coach_profile")
    .select("id, display_name, session_duration_minutes, buffer_minutes_after, blocked_dates")
    .eq("member_id", memberId)
    .eq("is_active", true)
    .single();

  const coach = coachRaw as CoachProfile | null;
  if (!coach) return { coach: null, windows: [] };

  const { data: windowsRaw } = await supabase
    .from("coach_availability")
    .select("id, day_of_week, start_minutes, end_minutes, timezone, is_active")
    .eq("coach_id", coach.id)
    .order("day_of_week", { ascending: true })
    .order("start_minutes", { ascending: true });

  const windows = (windowsRaw as AvailabilityWindow[] | null) ?? [];
  return { coach, windows };
}

export default async function CoachAvailabilityPage() {
  const member = await requireMember();
  const { coach, windows } = await getCoachData(member.id);

  if (!coach) {
    return (
      <div>
        <PageHeader
          title="Coaching Availability"
          subtitle="This area is only for Positives coaches who manage bookable session times."
          hero
        />
        <div className="member-container py-8 pb-28 md:py-10">
          <SurfaceCard
            tone="tint"
            padding="lg"
            elevated
            className="surface-card--editorial mx-auto max-w-2xl text-center"
          >
            <p className="member-detail-kicker">Coach-only settings</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-foreground">
              Your coaching sessions live in Account.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-[1.8] text-muted-foreground">
              Availability settings are for active coaches. If you are here to book, review, or
              purchase coaching sessions, head back to your Coaching Sessions page.
            </p>
            <Button href="/account/coaching" className="mt-6 justify-center">
              Back to Coaching Sessions
            </Button>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Manage Availability"
        subtitle={`Set your weekly coaching schedule. Members will only see slots during your active hours.`}
        hero
      />
      <div className="member-container flex flex-col gap-8 py-8 pb-28 md:py-10">
        <SurfaceCard elevated className="surface-card--editorial">
          <p className="member-detail-kicker">Weekly schedule</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
            Your availability windows
          </h2>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            Set the days and hours when members can book sessions. Session length is{" "}
            <strong>{coach.session_duration_minutes} minutes</strong> with a{" "}
            <strong>{coach.buffer_minutes_after}-minute buffer</strong> after each session.
          </p>
          <div className="mt-6">
            <AvailabilityEditor
              coachId={coach.id}
              initialWindows={windows}
              sessionDurationMinutes={coach.session_duration_minutes}
              initialBlockedDates={coach.blocked_dates ?? []}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard elevated className="surface-card--editorial">
          <p className="member-detail-kicker">Session settings</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
            Booking rules
          </h2>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            Contact the Positives team to adjust your session length or buffer time.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Session duration</p>
                <p className="text-sm text-muted-foreground">
                  {coach.session_duration_minutes} minutes
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Buffer after session</p>
                <p className="text-sm text-muted-foreground">
                  {coach.buffer_minutes_after} minutes
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Minimum booking notice</p>
                <p className="text-sm text-muted-foreground">2 hours</p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
