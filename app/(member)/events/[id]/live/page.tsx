import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvent } from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { LiveKitEventRoom } from "@/components/events/LiveKitEventRoom";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Live Event - Positives",
};

export default async function MemberLiveEventPage({ params }: { params: Params }) {
  const member = await requireActiveMember();
  const { id } = await params;
  const event = await getMemberEvent(id, member.subscription_tier, member.id);
  if (!event) notFound();

  if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
    notFound();
  }

  const now = currentTimestampMs();
  const startsAt = new Date(event.starts_at).getTime();
  const endsAt = new Date(event.ends_at).getTime();
  const roomOpen = now >= startsAt - 60 * 60 * 1000 && now <= endsAt + 30 * 60 * 1000;

  return (
    <div className="member-container py-8 md:py-12">
      <Link href={`/events/${event.id}`} className="mb-6 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground">
        Back to event
      </Link>

      <div className="mb-5">
        <p className="ui-section-eyebrow mb-2">Live Event</p>
        <h1 className="heading-balance font-heading text-4xl font-bold tracking-normal text-foreground">
          {event.title}
        </h1>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
        </p>
      </div>

      {roomOpen ? (
        <LiveKitEventRoom
          eventId={event.id}
          title={event.title}
          role="audience"
          startsAt={event.starts_at}
          endsAt={event.ends_at}
        />
      ) : (
        <SurfaceCard padding="lg">
          <p className="font-heading text-2xl font-semibold text-foreground">The live room is closed.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Join opens one hour before the event. After the event, the replay will appear on the event page when it is ready.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}
